#!/usr/bin/env tsx
/**
 * Analyze user_roles duplicates
 */
import { db } from "../db";
import { user_roles, users } from "../../shared/schema";
import { eq } from "drizzle-orm";

async function main() {
  console.log("\n🔍 Analyzing user assignments by org...\n");

  const assignments = await db
    .select({
      assignment_id: user_roles.id,
      user_id: user_roles.user_id,
      org_id: user_roles.org_id,
      store_id: user_roles.store_id,
      role_id: user_roles.role_id,
      username: users.username,
      email: users.email,
    })
    .from(user_roles)
    .leftJoin(users, eq(user_roles.user_id, users.id))
    .orderBy(user_roles.org_id, user_roles.user_id);

  // Group by org
  const byOrg: Record<string, any[]> = {};
  for (const a of assignments) {
    if (!byOrg[a.org_id]) byOrg[a.org_id] = [];
    byOrg[a.org_id].push(a);
  }

  for (const [orgId, records] of Object.entries(byOrg)) {
    console.log(`\n📦 Org: ${orgId}`);
    console.log(`   Total assignments: ${records.length}`);

    // Check for duplicates
    const userCounts: Record<number, number> = {};
    for (const r of records) {
      userCounts[r.user_id] = (userCounts[r.user_id] || 0) + 1;
    }

    const duplicates = Object.entries(userCounts).filter(
      ([_, count]) => count > 1
    );
    if (duplicates.length > 0) {
      console.log(`   ⚠️  DUPLICATE ASSIGNMENTS FOUND:`);
      for (const [userId, count] of duplicates) {
        const userRecords = records.filter((r) => r.user_id === Number(userId));
        console.log(
          `      User ${userId} (${userRecords[0].username}): ${count} assignments`
        );
        userRecords.forEach((r) => {
          console.log(
            `         - Assignment ID ${r.assignment_id}: role_id=${r.role_id}, store_id=${r.store_id}`
          );
        });
      }
    }

    // Show unique users
    const uniqueUsers = new Set(records.map((r) => r.user_id));
    console.log(`   Unique users: ${uniqueUsers.size}`);
    records.forEach((r) => {
      console.log(
        `      - ${r.username} (user_id: ${r.user_id}, assignment_id: ${r.assignment_id})`
      );
    });
  }

  console.log("\n");
}

main().catch((e) => {
  console.error("❌ Error:", e);
  process.exit(1);
});
