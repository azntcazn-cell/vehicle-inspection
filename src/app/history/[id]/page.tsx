import Link from "next/link";
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
import { requireSession, canEditInspection } from "@/lib/auth-helpers";

export default async function InspectionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession();
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
      updatedAt: inspections.updatedAt,
      inspectorId: inspections.inspectorId,
      vehicleVin: vehicles.vin,
      vehicleYear: vehicles.year,
      vehicleMake: vehicles.make,
      vehicleModel: vehicles.model,
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

  const canEdit = canEditInspection(session, inspection.inspectorId);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-xl font-semibold text-neutral-900 sm:text-2xl">
        {[inspection.vehicleYear, inspection.vehicleMake, inspection.vehicleModel]
          .filter(Boolean)
          .join(" ") || "Vehicle"}
      </h1>
      <p className="break-all text-sm text-neutral-500">{inspection.vehicleVin}</p>
      <p className="mt-2 text-sm text-neutral-500">
        Inspected by {inspection.inspectorName} on{" "}
        {new Date(inspection.startedAt).toLocaleString()}
      </p>
      {inspection.updatedAt && (
        <p className="mt-1 text-sm text-neutral-500">
          Last edited {new Date(inspection.updatedAt).toLocaleString()}
        </p>
      )}
      {inspection.odometer != null && (
        <p className="mt-1 text-sm text-neutral-500">
          Odometer: {inspection.odometer}
        </p>
      )}
      {failCount > 0 && (
        <p className="mt-3 inline-block rounded-full bg-red-100 px-2.5 py-1 text-sm font-medium text-red-700">
          {failCount} failed item{failCount > 1 ? "s" : ""}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <a
          href={`/history/${inspection.id}/pdf`}
          className="flex-1 rounded-md bg-neutral-900 px-4 py-2.5 text-center text-base font-medium text-white transition hover:bg-neutral-700 sm:flex-none"
        >
          Download PDF
        </a>
        {canEdit && (
          <Link
            href={`/history/${inspection.id}/edit`}
            className="flex-1 rounded-md border border-neutral-300 bg-white px-4 py-2.5 text-center text-base font-medium text-neutral-700 transition hover:bg-neutral-100 sm:flex-none"
          >
            Edit
          </Link>
        )}
      </div>

      {/* Always show a diagram — fall back to the blank template when the
          inspection was completed without any marks. */}
      {(
        <div className="mt-6">
          <h2 className="mb-2 text-lg font-semibold text-neutral-900">
            Vehicle Diagram
          </h2>
          <a
            href={inspection.diagramUrl ?? "/vehicle-diagram.jpg"}
            target="_blank"
            rel="noopener noreferrer"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={inspection.diagramUrl ?? "/vehicle-diagram.jpg"}
              alt="Vehicle diagram with marked damage"
              className="w-full rounded-lg border border-neutral-200 sm:max-w-md"
            />
          </a>
          <p className="mt-1 text-xs text-neutral-400">
            {inspection.diagramUrl
              ? "Tap the diagram to open full size"
              : "No damage was marked on this inspection"}
          </p>
          {diagramLabels.length > 0 && (
            <ol className="mt-3 flex flex-col gap-2 text-base text-neutral-700">
              {diagramLabels.map((label, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500 text-sm font-bold text-white">
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
            <h2 className="mb-2 text-lg font-semibold text-neutral-900">{category}</h2>
            <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
              {items.map((item, i) => (
                <div
                  key={i}
                  className={`px-4 py-3.5 text-base ${
                    i !== items.length - 1 ? "border-b border-neutral-100" : ""
                  } ${item.status === "fail" ? "bg-red-50" : ""}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-neutral-900">{item.label}</p>
                      {item.notes && (
                        <p className="mt-1 text-sm text-neutral-500">{item.notes}</p>
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
                              className="h-24 w-24 rounded-md border border-neutral-200 object-cover"
                            />
                          ) : (
                            <video
                              src={m.url}
                              muted
                              playsInline
                              controls
                              className="h-24 w-24 rounded-md border border-neutral-200 object-cover"
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
          <h2 className="mb-2 text-lg font-semibold text-neutral-900">Overall notes</h2>
          <p className="text-base text-neutral-600">{inspection.notes}</p>
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
    <span className={`shrink-0 rounded-full px-2.5 py-1 text-sm font-medium ${styles[status]}`}>
      {label[status]}
    </span>
  );
}
