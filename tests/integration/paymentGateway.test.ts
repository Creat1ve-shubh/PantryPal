import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import request from "supertest";
import express from "express";
import crypto from "crypto";
import { db } from "../../server/db";
import { organizations, stores, users, user_roles } from "../../shared/schema";
import { eq } from "drizzle-orm";

// Deterministic Razorpay mock: no network calls.
const subscriptionsCreateMock = vi
  .fn()
  .mockResolvedValue({ id: "sub_test_123" });

vi.mock("razorpay", () => {
  class Razorpay {
    subscriptions = {
      create: subscriptionsCreateMock,
    };

    constructor(_opts: unknown) {
      // no-op
    }
  }

  return { default: Razorpay };
});

type EnvOverrides = Record<string, string | undefined>;

async function buildAppWithEnv(overrides: EnvOverrides) {
  const keys = Object.keys(overrides);
  const previous: Record<string, string | undefined> = {};
  for (const key of keys) previous[key] = process.env[key];

  // Apply overrides (undefined means delete)
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  process.env.NODE_ENV = "test";
  process.env.VITEST = "true";

  // Force env.ts + routes.ts to re-evaluate with the updated env.
  vi.resetModules();

  const { registerRoutes } = await import("../../server/routes");

  const app = express();
  app.use(express.json());
  await registerRoutes(app);

  const restore = () => {
    for (const key of keys) {
      const oldValue = previous[key];
      if (oldValue === undefined) delete process.env[key];
      else process.env[key] = oldValue;
    }
  };

  return { app, restore };
}

async function buildFullAppWithEnv(overrides: EnvOverrides) {
  const keys = Object.keys(overrides);
  const previous: Record<string, string | undefined> = {};
  for (const key of keys) previous[key] = process.env[key];

  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  process.env.NODE_ENV = "test";
  process.env.VITEST = "true";

  vi.resetModules();

  const { registerRoutes } = await import("../../server/routes");
  const { setupAuth } = await import("../../server/auth");
  const { setupAuthRoutes } = await import("../../server/authRoutes");

  const app = express();
  app.use(express.json());
  setupAuth(app);
  setupAuthRoutes(app);
  await registerRoutes(app);

  const restore = () => {
    for (const key of keys) {
      const oldValue = previous[key];
      if (oldValue === undefined) delete process.env[key];
      else process.env[key] = oldValue;
    }
  };

  return { app, restore };
}

describe("Razorpay Payment Integration (robust)", () => {
  const createdOrgIds: string[] = [];
  const createdUserIds: number[] = [];

  beforeEach(() => {
    subscriptionsCreateMock.mockClear();
  });

  afterEach(async () => {
    // Best-effort cleanup for tests that create DB rows.
    for (const userId of createdUserIds.splice(0)) {
      await db.delete(user_roles).where(eq(user_roles.user_id, userId));
      await db.delete(users).where(eq(users.id, userId));
    }
    for (const orgId of createdOrgIds.splice(0)) {
      await db.delete(stores).where(eq(stores.org_id, orgId));
      await db.delete(organizations).where(eq(organizations.id, orgId));
    }
  });

  it("create-subscription returns 400 when Razorpay is unconfigured", async () => {
    const { app, restore } = await buildAppWithEnv({
      // Set to empty string (not undefined) so dotenv won't re-inject from .env
      RAZORPAY_KEY_ID: "",
      RAZORPAY_KEY_SECRET: "",
      RAZORPAY_PLAN_ID_STARTER_MONTHLY: "plan_starter_test",
    });

    const res = await request(app)
      .post("/api/payments/create-subscription")
      .send({ plan: "starter-monthly" });

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
    expect(res.body.error).toBe("Razorpay is not configured");
    expect(subscriptionsCreateMock).not.toHaveBeenCalled();

    restore();
  });

  it("create-subscription creates Razorpay subscription with mapped plan_id", async () => {
    const { app, restore } = await buildAppWithEnv({
      RAZORPAY_KEY_ID: "rzp_test_key",
      RAZORPAY_KEY_SECRET: "rzp_test_secret",
      RAZORPAY_PLAN_ID_STARTER_MONTHLY: "plan_starter_test",
    });

    const res = await request(app)
      .post("/api/payments/create-subscription")
      .send({ plan: "starter-monthly" });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.provider).toBe("razorpay");
    expect(res.body.plan).toBe("starter-monthly");
    expect(res.body.key_id).toBe("rzp_test_key");
    expect(res.body.subscription_id).toBe("sub_test_123");

    expect(subscriptionsCreateMock).toHaveBeenCalledTimes(1);
    expect(subscriptionsCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({ plan_id: "plan_starter_test" })
    );

    restore();
  });

  it("create-subscription rejects unknown plan or missing plan_id", async () => {
    const { app, restore } = await buildAppWithEnv({
      RAZORPAY_KEY_ID: "rzp_test_key",
      RAZORPAY_KEY_SECRET: "rzp_test_secret",
      RAZORPAY_PLAN_ID_STARTER_MONTHLY: "plan_starter_test",
      RAZORPAY_PLAN_ID_PREMIUM_MONTHLY: undefined,
    });

    const res = await request(app)
      .post("/api/payments/create-subscription")
      .send({ plan: "premium-monthly" });

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
    expect(res.body.error).toContain("plan_id not set");
    expect(subscriptionsCreateMock).not.toHaveBeenCalled();

    restore();
  });

  it("verify returns onboarding token for valid signature (order_id|payment_id)", async () => {
    const jwtSecret = "test-jwt-access-secret-min-32-chars-long-for-testing";
    const keySecret = "rzp_sig_secret";

    const { app, restore } = await buildAppWithEnv({
      RAZORPAY_KEY_SECRET: keySecret,
      JWT_ACCESS_SECRET: jwtSecret,
    });

    const payload = {
      razorpay_payment_id: "pay_test_001",
      razorpay_order_id: "order_test_001",
      razorpay_signature: "",
      plan: "starter-monthly",
    };

    const message = `${payload.razorpay_order_id}|${payload.razorpay_payment_id}`;
    payload.razorpay_signature = crypto
      .createHmac("sha256", keySecret)
      .update(message)
      .digest("hex");

    const res = await request(app).post("/api/payments/verify").send(payload);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.onboardingToken).toBeTypeOf("string");

    const { verifyAccessToken } = await import("../../server/utils/jwt");
    const decoded = verifyAccessToken(res.body.onboardingToken);
    expect(decoded.sub).toBe("order_test_001");
    expect(decoded.roles).toContain("onboarding");
    expect(decoded.plan).toBe("starter-monthly");

    restore();
  });

  it("verify rejects invalid signature", async () => {
    const { app, restore } = await buildAppWithEnv({
      RAZORPAY_KEY_SECRET: "rzp_sig_secret",
      JWT_ACCESS_SECRET: "test-jwt-access-secret-min-32-chars-long-for-testing",
    });

    const res = await request(app).post("/api/payments/verify").send({
      razorpay_payment_id: "pay_test_002",
      razorpay_order_id: "order_test_002",
      razorpay_signature: "bad_sig",
      plan: "starter-monthly",
    });

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
    expect(res.body.error).toBe("Invalid signature");

    restore();
  });

  it("webhook returns 200 for valid signature", async () => {
    const webhookSecret = "whsec_test";
    const { app, restore } = await buildAppWithEnv({
      RAZORPAY_WEBHOOK_SECRET: webhookSecret,
    });

    const body = {
      event: "payment.captured",
      payload: { payment: { entity: { id: "pay_123" } } },
    };
    const signature = crypto
      .createHmac("sha256", webhookSecret)
      .update(JSON.stringify(body))
      .digest("hex");

    const res = await request(app)
      .post("/api/payments/webhook")
      .set("X-Razorpay-Signature", signature)
      .send(body);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);

    restore();
  });

  it("webhook rejects invalid signature", async () => {
    const { app, restore } = await buildAppWithEnv({
      RAZORPAY_WEBHOOK_SECRET: "whsec_test",
    });

    const res = await request(app)
      .post("/api/payments/webhook")
      .set("X-Razorpay-Signature", "bad_sig")
      .send({ event: "payment.captured" });

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
    expect(res.body.error).toBe("Invalid webhook signature");

    restore();
  });

  it("after verify, register-organization persists plan + subscription_id", async () => {
    const jwtSecret = "test-jwt-access-secret-min-32-chars-long-for-testing";
    const razorpaySecret = "rzp_sig_secret";

    const { app, restore } = await buildFullAppWithEnv({
      RAZORPAY_KEY_SECRET: razorpaySecret,
      JWT_ACCESS_SECRET: jwtSecret,
    });

    const payment = {
      razorpay_payment_id: `pay_test_${Date.now()}`,
      razorpay_subscription_id: `sub_test_${Date.now()}`,
      razorpay_signature: "",
      plan: "premium-monthly",
    };

    const message = `${payment.razorpay_subscription_id}|${payment.razorpay_payment_id}`;
    payment.razorpay_signature = crypto
      .createHmac("sha256", razorpaySecret)
      .update(message)
      .digest("hex");

    const verifyRes = await request(app)
      .post("/api/payments/verify")
      .send(payment);

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.ok).toBe(true);
    expect(verifyRes.body.onboardingToken).toBeTypeOf("string");

    const registerPayload = {
      onboarding_token: verifyRes.body.onboardingToken,
      organization: { name: `Paid Org ${Date.now()}` },
      stores: [{ name: "Store A" }, { name: "Store B" }],
      admin: {
        username: `paid-admin-${Date.now()}`,
        email: `paid-${Date.now()}@example.com`,
        password: "pass1234",
        full_name: "Paid Admin",
        phone: "9999999999",
      },
      vendorDetails: {},
    };

    const regRes = await request(app)
      .post("/api/auth/register-organization")
      .send(registerPayload);

    expect(regRes.status).toBe(201);
    expect(regRes.body.organization?.id).toBeDefined();
    expect(regRes.body.stores?.length).toBe(2);

    const orgId = regRes.body.organization.id as string;
    createdOrgIds.push(orgId);
    if (regRes.body.admin?.id) createdUserIds.push(regRes.body.admin.id);

    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, orgId))
      .limit(1);

    expect(org).toBeDefined();
    expect(org.plan_name).toBe("premium-monthly");
    expect(org.subscription_id).toBe(payment.razorpay_subscription_id);

    restore();
  });
});
