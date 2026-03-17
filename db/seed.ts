import { db } from "./index";
import { users, locations } from "./schema";
import { hashPin } from "../lib/auth";

async function seed() {
  console.log("Seeding...");

  // Insert locations
  await db
    .insert(locations)
    .values([
      { name: "Rack A", description: "Main storage rack A" },
      { name: "Rack B", description: "Main storage rack B" },
      { name: "Yard", description: "Outdoor yard storage" },
    ])
    .onConflictDoNothing();

  // Insert users
  const adminPin = await hashPin("1234");
  const shopPin = await hashPin("0000");

  await db
    .insert(users)
    .values([
      { name: "Admin", pin: adminPin, role: "admin" },
      { name: "Shop", pin: shopPin, role: "user" },
    ])
    .onConflictDoNothing();

  console.log("Seed complete!");
  process.exit(0);
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
