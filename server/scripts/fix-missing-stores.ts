#!/usr/bin/env tsx
/**
 * Fix missing stores issue:
 * - Create default stores for orgs without stores
 * - Assign users to stores in their org
 */
import { db } from "../db";
import { user_roles, organizations, stores } from "../../shared/schema";
import { eq, and, isNull } from "drizzle-orm";

async function main() {
  console.log("\n🔧 Fixing missing stores and assignments...\n");

  // Get all organizations
  const allOrgs = await db.select().from(organizations);

  for (const org of allOrgs) {
    console.log(`\n📦 Processing org: ${org.name} (${org.id})`);

    // Check if org has stores
    const orgStores = await db
      .select()
      .from(stores)
      .where(eq(stores.org_id, org.id));

    let defaultStore;

    if (orgStores.length === 0) {
      // Create default store for this org
      console.log(`  ⚠️  No stores found. Creating default store...`);
      [defaultStore] = await db
        .insert(stores)
        .values({
          org_id: org.id,
          name: "Main Store",
        })
        .returning();
      console.log(
        `  ✅ Created store: ${defaultStore.name} (${defaultStore.id})`
      );
    } else {
      defaultStore = orgStores[0];
      console.log(
        `  ✅ Store exists: ${defaultStore.name} (${defaultStore.id})`
      );
    }

    // Find users in this org without store assignments
    const usersWithoutStore = await db
      .select()
      .from(user_roles)
      .where(and(eq(user_roles.org_id, org.id), isNull(user_roles.store_id)));

    console.log(
      `  📊 Users without store assignment: ${usersWithoutStore.length}`
    );

    if (usersWithoutStore.length > 0) {
      // Update all users without store to use default store
      for (const assignment of usersWithoutStore) {
        await db
          .update(user_roles)
          .set({ store_id: defaultStore.id })
          .where(eq(user_roles.id, assignment.id));

        console.log(
          `  ✓ Assigned user ${assignment.user_id} to store ${defaultStore.name}`
        );
      }
    }
  }

  console.log("\n✅ All fixes applied successfully!\n");
}

main().catch((e) => {
  console.error("❌ Error:", e);
  process.exit(1);
});
