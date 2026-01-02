import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import express from "express";
import { setupAuth } from "../../server/auth";
import { setupAuthRoutes } from "../../server/authRoutes";
import { signAccessToken } from "../../server/utils/jwt";
import { db } from "../../server/db";
import { organizations, stores, users, user_roles } from "../../shared/schema";
import { eq } from "drizzle-orm";

describe("Plan-based access (org registration)", () => {
  let app: express.Application;
  const createdOrgIds: string[] = [];
  const createdUserIds: number[] = [];

  beforeAll(() => {
    app = express();
    app.use(express.json());
    setupAuth(app);
    setupAuthRoutes(app);
  });

  afterAll(async () => {
    // Best-effort cleanup
    for (const userId of createdUserIds) {
      await db.delete(user_roles).where(eq(user_roles.user_id, userId));
      await db.delete(users).where(eq(users.id, userId));
    }
    for (const orgId of createdOrgIds) {
      await db.delete(stores).where(eq(stores.org_id, orgId));
      await db.delete(organizations).where(eq(organizations.id, orgId));
    }
  });

  it("starter-monthly (399) rejects >1 store", async () => {
    const onboardingToken = signAccessToken({
      sub: `sub_${Date.now()}`,
      roles: ["onboarding"],
      plan: "starter-monthly",
    });

    const payload = {
      onboarding_token: onboardingToken,
      organization: { name: `Starter Org ${Date.now()}` },
      stores: [{ name: "Store 1" }, { name: "Store 2" }],
      admin: {
        username: `starter-admin-${Date.now()}`,
        email: `starter-${Date.now()}@example.com`,
        password: "pass1234",
        full_name: "Starter Admin",
        phone: "9999999999",
      },
      vendorDetails: {},
    };

    const res = await request(app)
      .post("/api/auth/register-organization")
      .send(payload);

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Plan limit exceeded");
  });

  it("premium-monthly (999) allows multiple stores and persists plan_name", async () => {
    const onboardingToken = signAccessToken({
      sub: `sub_${Date.now()}`,
      roles: ["onboarding"],
      plan: "premium-monthly",
    });

    const payload = {
      onboarding_token: onboardingToken,
      organization: { name: `Premium Org ${Date.now()}` },
      stores: [{ name: "Store A" }, { name: "Store B" }],
      admin: {
        username: `premium-admin-${Date.now()}`,
        email: `premium-${Date.now()}@example.com`,
        password: "pass1234",
        full_name: "Premium Admin",
        phone: "9999999999",
      },
      vendorDetails: {},
    };

    const res = await request(app)
      .post("/api/auth/register-organization")
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body.organization?.id).toBeDefined();
    expect(res.body.stores?.length).toBe(2);

    const orgId = res.body.organization.id as string;
    createdOrgIds.push(orgId);
    if (res.body.admin?.id) createdUserIds.push(res.body.admin.id);

    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, orgId))
      .limit(1);
    expect(org).toBeDefined();
    expect(org.plan_name).toBe("premium-monthly");
  });
});
