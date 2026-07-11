import { eq, inArray } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import {
  inspections,
  vehicles,
  users,
  inspectionResults,
  checklistItems,
  inspectionMedia,
} from "@/db/schema";
import { requireSession } from "@/lib/auth-helpers";

export default async function InspectionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireSession();
  const { id } = await params;
  const inspectionId = Number(id);

  const [inspection] = await db
    .select({
      id: inspections.id,
      odometer: inspections.odometer,
      status: inspections.status,
      notes: inspections.notes,
      diagramUrl: inspections.diagramUrl,
      diagramLabels: inspections.diagramLabels,
      startedAt: inspections.startedAt,
      completedAt: inspections.completedAt,
      vehicleVin: vehicles.vin,
      inspectorName: users.name,
    })
    .from(inspections)
    .innerJoin(vehicles, eq(inspections.vehicleId, vehicles.id))
    .innerJoin(users, eq(inspections.inspectorId, users.id))
    .where(eq(inspections.id, inspectionId))
    .limit(1);

  if (!inspection) notFound();

  const results = await db
    .select({
      id: inspectionResults.id,
      status: inspectionResults.status,
      notes: inspectionResults.notes,
      category: checklistItems.category,
      label: checklistItems.label,
      sortOrder: checklistItems.sortOrder,
    })
    .from(inspectionResults)
    .innerJoin(checklistItems, eq(inspectionResults.itemId, checklistItems.id))
    .where(eq(inspectionResults.inspectionId, inspectionId))
    .orderBy(checklistItems.sortOrder);

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

  const resultsByCategory = Object.entries(
    results.reduce<Record<string, typeof results>>((acc, r) => {
      (acc[r.category] ??= []).push(r);
      return acc;
    }, {})
  );

  const failCount = results.filter((r) => r.status === "fail").length;

  let diagramLabels: { text: string }[] = [];
  if (inspection.diagramLabels) {
    try {
      diagramLabels = JSON.parse(inspection.diagramLabels);
    } catch {
      diagramLabels = [];
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-semibold text-neutral-900">
        {inspection.vehicleVin}
      </h1>
      <p className="mb-1 text-sm text-neutral-500">
        Inspected by {inspection.inspectorName} on{" "}
        {new Date(inspection.startedAt).toLocaleString()}
      </p>
      {inspection.odometer != null && (
        <p className="mb-1 text-sm text-neutral-500">
          Odometer: {inspection.odometer}
        </p>
      )}
      {failCount > 0 && (
        <p className="mb-4 inline-block rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
          {failCount} failed item{failCount > 1 ? "s" : ""}
        </p>
      )}

      {inspection.diagramUrl && (
        <div className="mt-4">
          <h2 className="mb-2 text-sm font-semibold text-neutral-900">Vehicle Diagram</h2>
          <a href={inspection.diagramUrl} target="_blank" rel="noopener noreferrer">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={inspection.diagramUrl}
              alt="Vehicle diagram with marked damage"
              className="w-full max-w-xs rounded-lg border border-neutral-200"
            />
          </a>
          {diagramLabels.length > 0 && (
            <ol className="mt-2 flex flex-col gap-1 text-sm text-neutral-600">
              {diagramLabels.map((label, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white">
                    {i + 1}
                  </span>
                  {label.text}
                </li>
              ))}
            </ol>
          )}
        </div>
      )}

      <div className="mt-6 flex flex-col gap-6">
        {resultsByCategory.map(([category, items]) => (
          <div key={category}>
            <h2 className="mb-2 text-sm font-semibold text-neutral-900">{category}</h2>
            <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
              {items.map((item, i) => (
                <div
                  key={i}
                  className={`px-4 py-3 text-sm ${
                    i !== items.length - 1 ? "border-b border-neutral-100" : ""
                  } ${item.status === "fail" ? "bg-red-50" : ""}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-neutral-900">{item.label}</p>
                      {item.notes && (
                        <p className="mt-1 text-xs text-neutral-500">{item.notes}</p>
                      )}
                    </div>
                    <StatusBadge status={item.status} />
                  </div>
                  {mediaByResult[item.id]?.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {mediaByResult[item.id].map((m) => (
                        <a
                          key={m.id}
                          href={m.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {m.type === "image" ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={m.url}
                              alt=""
                              className="h-20 w-20 rounded-md border border-neutral-200 object-cover"
                            />
                          ) : (
                            <video
                              src={m.url}
                              muted
                              className="h-20 w-20 rounded-md border border-neutral-200 object-cover"
                            />
                          )}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {inspection.notes && (
        <div className="mt-6">
          <h2 className="mb-2 text-sm font-semibold text-neutral-900">Overall notes</h2>
          <p className="text-sm text-neutral-600">{inspection.notes}</p>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: "pass" | "fail" | "na" }) {
  const styles = {
    pass: "bg-green-100 text-green-700",
    fail: "bg-red-100 text-red-700",
    na: "bg-neutral-100 text-neutral-500",
  };
  const label = { pass: "Pass", fail: "Fail", na: "N/A" };
  return (
    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${styles[status]}`}>
      {label[status]}
    </span>
  );
}
