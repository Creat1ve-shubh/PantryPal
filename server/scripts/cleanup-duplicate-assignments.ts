#!/usr/bin/env tsx
/**
 * Remove duplicate user_role assignments
 * Keeps only the latest assignment for each user-org-role combination
 */
import { db } from "../db";
import { user_roles } from "../../shared/schema";
import { eq, and, sql } from "drizzle-orm";

async function main() {
  console.log("\n🧹 Cleaning up duplicate user_role assignments...\n");

  // Find all duplicate assignments (same user_id, org_id, role_id)
  const allAssignments = await db
    .select()
    .from(user_roles)
    .orderBy(
      user_roles.user_id,
      user_roles.org_id,
      user_roles.role_id,
      user_roles.created_at
    );

  // Group by user+org+role
  const groups: Record<string, typeof allAssignments> = {};
  for (const a of allAssignments) {
    const key = `${a.user_id}-${a.org_id}-${a.role_id}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(a);
  }

  let deletedCount = 0;
  let keptCount = 0;

  for (const [key, assignments] of Object.entries(groups)) {
    if (assignments.length > 1) {
      console.log(
        `\n📋 Found ${assignments.length} duplicate assignments for ${key}`
      );

      // Keep the LAST one (most recent created_at)
      const toKeep = assignments[assignments.length - 1];
      const toDelete = assignments.slice(0, -1);

      console.log(
        `   ✓ Keeping assignment ID ${toKeep.id} (created ${toKeep.created_at})`
      );
      keptCount++;

      for (const del of toDelete) {
        console.log(
          `   ✗ Deleting assignment ID ${del.id} (created ${del.created_at})`
        );
        await db.delete(user_roles).where(eq(user_roles.id, del.id));
        deletedCount++;
      }
    } else {
      keptCount++;
    }
  }

  console.log(`\n✅ Cleanup complete!`);
  console.log(`   Deleted: ${deletedCount} duplicate assignments`);
  console.log(`   Kept: ${keptCount} unique assignments\n`);
}

main().catch((e) => {
  console.error("❌ Error:", e);
  process.exit(1);
});
