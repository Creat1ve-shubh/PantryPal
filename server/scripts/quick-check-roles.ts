#!/usr/bin/env tsx
import { db } from "../db";
import { user_roles } from "../../shared/schema";

async function main() {
  console.log("\n📊 Checking user_roles table...\n");

  const allAssignments = await db.select().from(user_roles);

  console.log(`Total assignments: ${allAssignments.length}\n`);

  if (allAssignments.length === 0) {
    console.log("❌ NO ASSIGNMENTS FOUND - TABLE IS EMPTY!");
    console.log("This confirms drizzle-kit push truncated the table.");
    console.log("\nRun: npx tsx server/scripts/reassign-users.ts\n");
  } else {
    console.log("✅ Assignments exist:");
    allAssignments.forEach((a) => {
      console.log(
        `   User ${a.user_id} → Org ${a.org_id?.substring(
          0,
          8
        )}... → Store ${a.store_id?.substring(0, 8)}...`
      );
    });
  }
}

main().catch(console.error);
