import "dotenv/config";
import bcrypt from "bcryptjs";
import { db } from "./index";
import { users, checklistTemplates, checklistItems } from "./schema";

const DEFAULT_ITEMS: { category: string; label: string }[] = [
  { category: "Exterior", label: "Headlights working" },
  { category: "Exterior", label: "Taillights / brake lights working" },
  { category: "Exterior", label: "Turn signals working" },
  { category: "Exterior", label: "Mirrors intact and adjusted" },
  { category: "Exterior", label: "Windshield free of cracks/chips" },
  { category: "Exterior", label: "Wipers functional" },
  { category: "Tires", label: "Tire tread depth adequate" },
  { category: "Tires", label: "Tire pressure correct" },
  { category: "Tires", label: "No visible tire damage" },
  { category: "Tires", label: "Spare tire present and inflated" },
  { category: "Brakes", label: "Brake pedal feels firm" },
  { category: "Brakes", label: "Parking brake holds" },
  { category: "Brakes", label: "No unusual brake noise" },
  { category: "Fluids", label: "Engine oil level correct" },
  { category: "Fluids", label: "Coolant level correct" },
  { category: "Fluids", label: "Windshield washer fluid filled" },
  { category: "Fluids", label: "No visible fluid leaks" },
  { category: "Interior", label: "Seatbelts functional" },
  { category: "Interior", label: "Horn works" },
  { category: "Interior", label: "Dashboard warning lights normal" },
  { category: "Interior", label: "First aid kit / fire extinguisher present" },
  { category: "Engine", label: "Belts and hoses in good condition" },
  { category: "Engine", label: "Battery secure, no corrosion" },
  { category: "Engine", label: "No unusual engine noise" },
];

async function main() {
  const [template] = await db
    .insert(checklistTemplates)
    .values({ name: "Pre-Trip Inspection" })
    .returning();

  await db.insert(checklistItems).values(
    DEFAULT_ITEMS.map((item, i) => ({
      templateId: template.id,
      category: item.category,
      label: item.label,
      sortOrder: i,
    }))
  );

  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@example.com";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "changeme123";
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  await db.insert(users).values({
    name: "Admin",
    email: adminEmail,
    passwordHash,
    role: "admin",
  });

  console.log(`Seeded checklist template "${template.name}" with ${DEFAULT_ITEMS.length} items.`);
  console.log(`Seeded admin user: ${adminEmail} / ${adminPassword}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
