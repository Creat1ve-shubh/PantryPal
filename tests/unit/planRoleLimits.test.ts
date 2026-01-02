import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "../../server/db";
import { organizations, roles, user_roles, users } from "../../shared/schema";
import { eq, and } from "drizzle-orm";
import { createInvite, acceptInvite } from "../../server/services/authService";

describe("Plan-based access (role limits)", () => {
  let orgId: string;
  let storeManagerRoleId: number;
  const createdUserIds: number[] = [];
  const createdInviteTokens: string[] = [];

  beforeAll(async () => {
    const [org] = await db
      .insert(organizations)
      .values({
        name: `Starter Limits Org ${Date.now()}`,
        plan_name: "starter-monthly",
      })
      .returning();
    orgId = org.id;

    const [storeMgrRole] = await db
      .select()
      .from(roles)
      .where(eq(roles.name, "store_manager"))
      .limit(1);
    if (!storeMgrRole) throw new Error("store_manager role not seeded");
    storeManagerRoleId = storeMgrRole.id;
  });

  afterAll(async () => {
    // cleanup assignments and users we created via acceptInvite
    for (const userId of createdUserIds) {
      await db.delete(user_roles).where(eq(user_roles.user_id, userId));
      await db.delete(users).where(eq(users.id, userId));
    }
    if (orgId) {
      await db.delete(user_roles).where(eq(user_roles.org_id, orgId));
      await db.delete(organizations).where(eq(organizations.id, orgId));
    }
  });

  it("starter-monthly allows only 3 store_manager users", async () => {
    // Accept 3 invites (OK)
    for (let i = 0; i < 3; i++) {
      const email = `sm-${Date.now()}-${i}@example.com`;
      const { token } = await createInvite({
        org_id: orgId,
        email,
        role_id: storeManagerRoleId,
        full_name: "Store Manager",
        phone: "9999999999",
        expires_in_hours: 2,
      });
      createdInviteTokens.push(token);
      const result = await acceptInvite(token, "Pass1234!", "Store Manager");
      createdUserIds.push(result.user_id);
    }

    // 4th invite should be rejected (either at invite creation or accept)
    const email = `sm-${Date.now()}-overflow@example.com`;
    await expect(
      createInvite({
        org_id: orgId,
        email,
        role_id: storeManagerRoleId,
        full_name: "Store Manager",
        phone: "9999999999",
        expires_in_hours: 2,
      })
    ).rejects.toThrow(/Plan limit exceeded/i);
  });
});
