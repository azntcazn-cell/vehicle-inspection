import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { vehicles, checklistTemplates, checklistItems } from "@/db/schema";
import { requireInspector } from "@/lib/auth-helpers";
import { submitInspection } from "../actions";
import { InspectForm } from "./inspect-form";

export default async function InspectPage({
  params,
}: {
  params: Promise<{ vehicleId: string }>;
}) {
  await requireInspector();
  const { vehicleId } = await params;
  const id = Number(vehicleId);

  const [vehicle] = await db.select().from(vehicles).where(eq(vehicles.id, id)).limit(1);
  if (!vehicle || !vehicle.active) notFound();

  const [template] = await db
    .select()
    .from(checklistTemplates)
    .orderBy(checklistTemplates.id)
    .limit(1);
  if (!template) notFound();

  const items = await db
    .select()
    .from(checklistItems)
    .where(
      and(
        eq(checklistItems.templateId, template.id),
        eq(checklistItems.active, true)
      )
    )
    .orderBy(checklistItems.sortOrder);

  const itemsByCategory = Object.entries(
    items.reduce<Record<string, typeof items>>((acc, item) => {
      (acc[item.category] ??= []).push(item);
      return acc;
    }, {})
  );

  const boundSubmit = submitInspection.bind(null, vehicle.id, template.id);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-xl font-semibold text-neutral-900 sm:text-2xl">
        Inspect{" "}
        {[vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" ") ||
          "Vehicle"}
      </h1>
      <p className="mb-6 break-all text-sm text-neutral-500">{vehicle.vin}</p>
      <InspectForm action={boundSubmit} itemsByCategory={itemsByCategory} />
    </div>
  );
}
