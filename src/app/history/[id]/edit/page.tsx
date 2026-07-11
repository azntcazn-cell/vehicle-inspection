import { eq, inArray } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { db } from "@/db";
import {
  inspections,
  vehicles,
  checklistItems,
  inspectionResults,
  inspectionMedia,
} from "@/db/schema";
import { requireSession, canEditInspection } from "@/lib/auth-helpers";
import { updateInspection } from "@/app/inspect/actions";
import { InspectForm, type InspectFormInitialData } from "@/app/inspect/[vehicleId]/inspect-form";

export default async function EditInspectionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession();
  const { id } = await params;
  const inspectionId = Number(id);

  const [inspection] = await db
    .select()
    .from(inspections)
    .where(eq(inspections.id, inspectionId))
    .limit(1);
  if (!inspection) notFound();

  if (!canEditInspection(session, inspection.inspectorId)) {
    redirect(`/history/${inspectionId}`);
  }

  const [vehicle] = await db
    .select()
    .from(vehicles)
    .where(eq(vehicles.id, inspection.vehicleId))
    .limit(1);
  if (!vehicle) notFound();

  const items = await db
    .select()
    .from(checklistItems)
    .where(eq(checklistItems.templateId, inspection.templateId))
    .orderBy(checklistItems.sortOrder);

  const itemsByCategory = Object.entries(
    items.reduce<Record<string, typeof items>>((acc, item) => {
      (acc[item.category] ??= []).push(item);
      return acc;
    }, {})
  );

  const results = await db
    .select()
    .from(inspectionResults)
    .where(eq(inspectionResults.inspectionId, inspectionId));

  const media =
    results.length > 0
      ? await db
          .select()
          .from(inspectionMedia)
          .where(
            inArray(
              inspectionMedia.resultId,
              results.map((r) => r.id)
            )
          )
      : [];
  const mediaByResult = media.reduce<Record<number, typeof media>>((acc, m) => {
    (acc[m.resultId] ??= []).push(m);
    return acc;
  }, {});

  const itemsById: InspectFormInitialData["itemsById"] = {};
  for (const result of results) {
    itemsById[result.itemId] = {
      status: result.status,
      notes: result.notes,
      media: (mediaByResult[result.id] ?? []).map((m) => ({ url: m.url, type: m.type })),
    };
  }

  let diagramLabels: { x: number; y: number; text: string }[] | undefined;
  if (inspection.diagramLabels) {
    try {
      diagramLabels = JSON.parse(inspection.diagramLabels);
    } catch {
      diagramLabels = undefined;
    }
  }

  const initialData: InspectFormInitialData = {
    odometer: inspection.odometer,
    notes: inspection.notes,
    diagramUrl: inspection.diagramUrl,
    diagramLabels,
    itemsById,
  };

  const boundUpdate = updateInspection.bind(null, inspectionId, inspection.templateId);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-semibold text-neutral-900">Edit Inspection</h1>
      <p className="mb-6 text-sm text-neutral-500">{vehicle.vin}</p>
      <InspectForm
        action={boundUpdate}
        itemsByCategory={itemsByCategory}
        initialData={initialData}
        submitLabel="Save Changes"
      />
    </div>
  );
}
