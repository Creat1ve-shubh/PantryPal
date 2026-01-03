import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import request from "supertest";
import express from "express";
import crypto from "crypto";

import { db } from "../../server/db";
import {
  organizations,
  stores,
  users,
  user_roles,
  roles,
  products,
  bills,
  bill_items,
} from "../../shared/schema";
import { eq } from "drizzle-orm";

function hmacSha256Hex(secret: string, message: string) {
  return crypto.createHmac("sha256", secret).update(message).digest("hex");
}

async function ensureRoleSeeded(roleName: string) {
  const existing = await db
    .select()
    .from(roles)
    .where(eq(roles.name, roleName))
    .limit(1);
  if (existing.length) return;

  await db.insert(roles).values({ name: roleName } as any);
}

describe("End-to-end business flow (payment -> org -> login -> add product -> scan -> checkout)", () => {
  let app: express.Application;
  let agent: request.SuperAgentTest;

  // Track entities for cleanup
  const createdOrgIds: string[] = [];
  const createdUserIds: number[] = [];
  const createdBillIds: string[] = [];
  const createdProductIds: string[] = [];

  beforeAll(async () => {
    // Ensure required roles exist; some fresh DBs may not have them.
    await ensureRoleSeeded("admin");
    await ensureRoleSeeded("store_owner");

    // Ensure consistent secrets for verify/register in this test process.
    process.env.NODE_ENV = "test";
    process.env.VITEST = "true";
    process.env.RAZORPAY_KEY_SECRET = "rzp_sig_secret";
    process.env.JWT_ACCESS_SECRET =
      "test-jwt-access-secret-min-32-chars-long-for-testing";
    process.env.JWT_REFRESH_SECRET =
      "test-jwt-refresh-secret-min-32-chars-long-for-testing";
    process.env.SESSION_SECRET =
      "test-session-secret-min-32-chars-long-for-testing";

    // Re-evaluate env/routes/auth modules with updated env vars.
    vi.resetModules();

    const { setupAuth } = await import("../../server/auth");
    const { setupAuthRoutes } = await import("../../server/authRoutes");
    const { registerRoutes } = await import("../../server/routes");

    app = express();
    app.use(express.json());

    setupAuth(app);
    setupAuthRoutes(app);
    await registerRoutes(app);

    agent = request.agent(app);
  });

  afterAll(async () => {
    // Cleanup in reverse dependency order (best-effort)
    for (const billId of createdBillIds.splice(0)) {
      await db.delete(bill_items).where(eq(bill_items.bill_id, billId));
      await db.delete(bills).where(eq(bills.id, billId));
    }

    for (const productId of createdProductIds.splice(0)) {
      await db.delete(products).where(eq(products.id, productId));
    }

    for (const userId of createdUserIds.splice(0)) {
      await db.delete(user_roles).where(eq(user_roles.user_id, userId));
      await db.delete(users).where(eq(users.id, userId));
    }

    for (const orgId of createdOrgIds.splice(0)) {
      await db.delete(stores).where(eq(stores.org_id, orgId));
      await db.delete(organizations).where(eq(organizations.id, orgId));
    }
  });

  it("runs the complete flow over HTTP and preserves invariants", async () => {
    // 1) Verify payment -> onboarding token
    const subscriptionId = `sub_e2e_${Date.now()}`;
    const paymentId = `pay_e2e_${Date.now()}`;
    const plan = "premium-monthly";

    const sig = hmacSha256Hex(
      process.env.RAZORPAY_KEY_SECRET || "",
      `${subscriptionId}|${paymentId}`
    );

    const verifyRes = await agent.post("/api/payments/verify").send({
      razorpay_payment_id: paymentId,
      razorpay_subscription_id: subscriptionId,
      razorpay_signature: sig,
      plan,
    });

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.ok).toBe(true);
    expect(verifyRes.body.onboardingToken).toBeTypeOf("string");

    // 2) Register organization using onboarding token
    const username = `e2e-admin-${Date.now()}`;
    const email = `e2e-${Date.now()}@example.com`;
    const password = "pass1234";

    const regRes = await agent.post("/api/auth/register-organization").send({
      onboarding_token: verifyRes.body.onboardingToken,
      organization: { name: `E2E Org ${Date.now()}` },
      stores: [{ name: "Main Store" }, { name: "Branch Store" }],
      admin: {
        username,
        email,
        password,
        full_name: "E2E Admin",
        phone: "9999999999",
      },
      vendorDetails: {},
    });

    expect(regRes.status).toBe(201);
    const orgId = regRes.body.organization?.id as string;
    const adminId = regRes.body.admin?.id as number;

    expect(orgId).toBeTypeOf("string");
    expect(regRes.body.stores?.length).toBe(2);

    createdOrgIds.push(orgId);
    if (adminId) createdUserIds.push(adminId);

    // 3) Login (session cookie)
    const loginRes = await agent.post("/api/auth/login").send({
      username,
      password,
    });

    expect(loginRes.status).toBe(200);

    // 4) Add product
    const barcode = `BAR-${Date.now()}`;
    const createProductRes = await agent.post("/api/products").send({
      name: "E2E Product",
      category: "Snacks",
      brand: "TestBrand",
      barcode,
      mrp: 100,
      buying_cost: 70,
      quantity_in_stock: 10,
      min_stock_level: 1,
      unit: "piece",
      // date-only strings should be accepted
      manufacturing_date: "2026-01-01",
      expiry_date: "2026-12-31",
      description: "E2E product for scan/checkout flow",
    });

    expect(createProductRes.status).toBe(201);
    const productId = createProductRes.body.id as string;
    createdProductIds.push(productId);

    // 5) Scan product by code (barcode)
    const scanRes = await agent.get(
      `/api/products/search/${encodeURIComponent(barcode)}`
    );
    expect(scanRes.status).toBe(200);
    expect(scanRes.body.id).toBe(productId);

    // 6) Create bill
    const billRes = await agent.post("/api/bills").send({
      bill_number: `E2E-BILL-${Date.now()}`,
      discount_amount: 0,
      tax_amount: 0,
      payment_method: "cash",
    });

    expect(billRes.status).toBe(201);
    const billId = billRes.body.id as string;
    createdBillIds.push(billId);

    // 7) Add scanned product to bill
    const addItemRes = await agent
      .post(`/api/bills/${encodeURIComponent(billId)}/items`)
      .send({ product_id: productId, quantity: 2 });

    expect(addItemRes.status).toBe(201);

    // 8) Finalize (checkout)
    const finalizeRes = await agent.patch(
      `/api/bills/${encodeURIComponent(billId)}/finalize`
    );

    expect(finalizeRes.status).toBe(200);
    expect(finalizeRes.body.finalized_at).toBeDefined();

    // 9) Stock decreased
    const getProductRes = await agent.get(
      `/api/products/${encodeURIComponent(productId)}`
    );
    expect(getProductRes.status).toBe(200);
    expect(getProductRes.body.quantity_in_stock).toBe(8);

    // 10) Plan + subscription_id persisted (production invariant)
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, orgId))
      .limit(1);

    expect(org).toBeDefined();
    expect(org.plan_name).toBe(plan);
    expect(org.subscription_id).toBe(subscriptionId);
  });

  it("prevents reusing the same onboarding token (subscription replay protection)", async () => {
    const subscriptionId = `sub_replay_${Date.now()}`;
    const paymentId = `pay_replay_${Date.now()}`;
    const plan = "starter-monthly";

    const sig = hmacSha256Hex(
      process.env.RAZORPAY_KEY_SECRET || "",
      `${subscriptionId}|${paymentId}`
    );

    const verifyRes = await agent.post("/api/payments/verify").send({
      razorpay_payment_id: paymentId,
      razorpay_subscription_id: subscriptionId,
      razorpay_signature: sig,
      plan,
    });

    expect(verifyRes.status).toBe(200);
    const token = verifyRes.body.onboardingToken as string;

    const first = await agent.post("/api/auth/register-organization").send({
      onboarding_token: token,
      organization: { name: `Replay Org 1 ${Date.now()}` },
      stores: [{ name: "Store 1" }],
      admin: {
        username: `replay-admin-1-${Date.now()}`,
        email: `replay-1-${Date.now()}@example.com`,
        password: "pass1234",
        full_name: "Replay Admin 1",
        phone: "9999999999",
      },
      vendorDetails: {},
    });

    expect(first.status).toBe(201);
    const orgId = first.body.organization?.id as string;
    const adminId = first.body.admin?.id as number;
    createdOrgIds.push(orgId);
    if (adminId) createdUserIds.push(adminId);

    const second = await agent.post("/api/auth/register-organization").send({
      onboarding_token: token,
      organization: { name: `Replay Org 2 ${Date.now()}` },
      stores: [{ name: "Store 2" }],
      admin: {
        username: `replay-admin-2-${Date.now()}`,
        email: `replay-2-${Date.now()}@example.com`,
        password: "pass1234",
        full_name: "Replay Admin 2",
        phone: "9999999999",
      },
      vendorDetails: {},
    });

    expect(second.status).toBe(409);
    expect(second.body.error).toBe("Subscription already used");
  });
});
