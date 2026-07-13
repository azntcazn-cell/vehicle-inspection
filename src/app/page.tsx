import Link from "next/link";
import { and, desc, eq, inArray, like, or } from "drizzle-orm";
import { db } from "@/db";
import { vehicles, inspections, inspectionResults } from "@/db/schema";
import { requireSession } from "@/lib/auth-helpers";
import { VehicleSearch } from "@/components/vehicle-search";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await requireSession();
  const { q } = await searchParams;

  const search = q?.trim()
    ? or(
        like(vehicles.vin, `%${q.trim()}%`),
        like(vehicles.make, `%${q.trim()}%`),
        like(vehicles.model, `%${q.trim()}%`),
        like(vehicles.plate, `%${q.trim()}%`)
      )
    : undefined;

  const activeVehicles = await db
    .select()
    .from(vehicles)
    .where(and(eq(vehicles.active, true), search))
    .orderBy(vehicles.vin);

  const recentInspections = await db
    .select({
      id: inspections.id,
      vehicleId: inspections.vehicleId,
      status: inspections.status,
      startedAt: inspections.startedAt,
    })
    .from(inspections)
    .orderBy(desc(inspections.startedAt));

  const lastInspectionByVehicle = new Map<number, (typeof recentInspections)[number]>();
  for (const inspection of recentInspections) {
    if (!lastInspectionByVehicle.has(inspection.vehicleId)) {
      lastInspectionByVehicle.set(inspection.vehicleId, inspection);
    }
  }

  const lastInspectionIds = [...lastInspectionByVehicle.values()].map((i) => i.id);
  const failRows =
    lastInspectionIds.length > 0
      ? await db
          .selectDistinct({ inspectionId: inspectionResults.inspectionId })
          .from(inspectionResults)
          .where(
            and(
              eq(inspectionResults.status, "fail"),
              inArray(inspectionResults.inspectionId, lastInspectionIds)
            )
          )
      : [];
  const failSet = new Set(failRows.map((r) => r.inspectionId));

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-neutral-900">Dashboard</h1>
        {session.user.role === "admin" && (
          <Link
            href="/vehicles/new"
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-700"
          >
            Add Vehicle
          </Link>
        )}
      </div>

      <VehicleSearch q={q} action="/" />

      {activeVehicles.length === 0 ? (
        <p className="text-sm text-neutral-500">
          {q ? "No vehicles match your search." : "No active vehicles."}
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
          <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-neutral-500">
              <tr>
                <th className="px-4 py-3 font-medium">Vehicle</th>
                <th className="px-4 py-3 font-medium">Last Inspection</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {activeVehicles.map((vehicle) => {
                const last = lastInspectionByVehicle.get(vehicle.id);
                const hasFail = last ? failSet.has(last.id) : false;
                return (
                  <tr key={vehicle.id} className="border-b border-neutral-100 last:border-0">
                    <td className="px-4 py-3">
                      <p className="font-medium text-neutral-900">
                        {[vehicle.year, vehicle.make, vehicle.model]
                          .filter(Boolean)
                          .join(" ") || "Vehicle"}
                      </p>
                      <p className="text-xs text-neutral-500">{vehicle.vin}</p>
                    </td>
                    <td className="px-4 py-3">
                      {last ? (
                        <div className="flex items-center gap-2">
                          <span className="text-neutral-600">
                            {new Date(last.startedAt).toLocaleDateString()}
                          </span>
                          {hasFail && (
                            <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                              Failed items
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-neutral-400">Never inspected</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {last ? (
                        <div className="flex items-center gap-3">
                          <Link
                            href={`/history/${last.id}`}
                            className="whitespace-nowrap rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-neutral-700"
                          >
                            View Inspection
                          </Link>
                          <Link
                            href={`/inspect/${vehicle.id}`}
                            className="whitespace-nowrap text-sm text-neutral-500 hover:text-neutral-900"
                          >
                            New inspection
                          </Link>
                        </div>
                      ) : (
                        <Link
                          href={`/inspect/${vehicle.id}`}
                          className="whitespace-nowrap rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-neutral-700"
                        >
                          Start Inspection
                        </Link>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  );
}
