#!/usr/bin/env tsx
/**
 * Check database data for debugging
 */
import { db } from "../db";
import { users, user_roles, organizations, stores } from "../../shared/schema";

async function main() {
  console.log("\n🔍 Checking database data...\n");

  // Check users
  const allUsers = await db.select().from(users);
  console.log(`📊 Total users: ${allUsers.length}`);
  if (allUsers.length > 0) {
    console.log("Users:", allUsers.map(u => ({
      id: u.id,
      username: u.username,
      email: u.email,
      role: u.role,
      is_active: u.is_active
    })));
  }

  // Check organizations
  const allOrgs = await db.select().from(organizations);
  console.log(`\n📊 Total organizations: ${allOrgs.length}`);
  if (allOrgs.length > 0) {
    console.log("Organizations:", allOrgs);
  }

  // Check stores
  const allStores = await db.select().from(stores);
  console.log(`\n📊 Total stores: ${allStores.length}`);
  if (allStores.length > 0) {
    console.log("Stores:", allStores);
  }

  // Check user_roles (assignments)
  const allAssignments = await db.select().from(user_roles);
  console.log(`\n📊 Total user role assignments: ${allAssignments.length}`);
  if (allAssignments.length > 0) {
    console.log("Assignments:", allAssignments);
  }

  console.log("\n✅ Database check complete\n");
}

main().catch((e) => {
  console.error("❌ Error:", e);
  process.exit(1);
});
