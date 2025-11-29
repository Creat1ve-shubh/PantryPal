#!/usr/bin/env tsx
/**
 * Re-assign users to organizations and stores
 * Run this if user_roles table was truncated
 */
import { db } from "../db";
import {
  users,
  user_roles,
  organizations,
  stores,
  roles,
} from "../../shared/schema";
import { eq } from "drizzle-orm";

async function main() {
  console.log("\n🔧 Re-assigning users to organizations...\n");

  // Get all data
  const allUsers = await db.select().from(users);
  const allOrgs = await db.select().from(organizations);
  const allStores = await db.select().from(stores);
  const allRoles = await db.select().from(roles);

  console.log(`📊 Found:`);
  console.log(`   Users: ${allUsers.length}`);
  console.log(`   Organizations: ${allOrgs.length}`);
  console.log(`   Stores: ${allStores.length}`);
  console.log(`   Roles: ${allRoles.length}\n`);

  // Find admin role
  const adminRole = allRoles.find((r) => r.name === "admin");
  if (!adminRole) {
    console.error("❌ Admin role not found! Run seed-rbac.ts first");
    return;
  }

  let assignedCount = 0;
  let skippedCount = 0;

  // Assign each user to appropriate org and store
  for (const user of allUsers) {
    // Check if user already has assignment
    const existing = await db
      .select()
      .from(user_roles)
      .where(eq(user_roles.user_id, user.id))
      .limit(1);

    if (existing.length > 0) {
      console.log(
        `✓ User ${user.username} already has assignment (org: ${existing[0].org_id})`
      );
      skippedCount++;
      continue;
    }

    // Logic: Assign based on email/username pattern or default to first org
    let targetOrg = allOrgs[0];

    // If user email/username contains specific patterns, assign to specific org
    if (user.email?.includes("sample") || user.username?.includes("sample")) {
      // Find "Sample Org" if exists
      const sampleOrg = allOrgs.find((o) =>
        o.name.toLowerCase().includes("sample")
      );
      if (sampleOrg) targetOrg = sampleOrg;
    }

    // Find a store in this org
    const targetStore = allStores.find((s) => s.org_id === targetOrg.id);

    if (!targetOrg || !targetStore) {
      console.log(`⚠️  No org/store available for ${user.username}`);
      continue;
    }

    try {
      await db.insert(user_roles).values({
        user_id: user.id,
        org_id: targetOrg.id,
        store_id: targetStore.id,
        role_id: adminRole.id,
      });

      console.log(
        `✅ Assigned ${user.username} → org: ${targetOrg.name}, store: ${targetStore.name}`
      );
      assignedCount++;
    } catch (error: any) {
      console.error(`❌ Error assigning ${user.username}:`, error.message);
    }
  }

  console.log(`\n✅ Assignment complete!`);
  console.log(`   New assignments: ${assignedCount}`);
  console.log(`   Already assigned: ${skippedCount}\n`);
}

main().catch((e) => {
  console.error("❌ Error:", e);
  process.exit(1);
});
