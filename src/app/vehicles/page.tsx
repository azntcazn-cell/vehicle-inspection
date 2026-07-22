import Link from "next/link";
import { desc, like, or } from "drizzle-orm";
import { db } from "@/db";
import { vehicles } from "@/db/schema";
import { requireInspector } from "@/lib/auth-helpers";
import { ToggleActiveButton } from "./toggle-active-button";
import { VehicleSearch } from "@/components/vehicle-search";

export default async function VehiclesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireInspector();
  const { q } = await searchParams;

  const search = q?.trim()
    ? or(
        like(vehicles.vin, `%${q.trim()}%`),
        like(vehicles.make, `%${q.trim()}%`),
        like(vehicles.model, `%${q.trim()}%`),
        like(vehicles.buyerName, `%${q.trim()}%`)
      )
    : undefined;

  const allVehicles = await db
    .select()
    .from(vehicles)
    .where(search)
    .orderBy(desc(vehicles.active), vehicles.vin);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold text-neutral-900">Vehicles</h1>

      <VehicleSearch q={q} action="/vehicles" />

      {allVehicles.length === 0 ? (
        <p className="text-sm text-neutral-500">
          {q ? "No vehicles match your search." : "No vehicles yet."}
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
          <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-neutral-500">
              <tr>
                <th className="px-4 py-3 font-medium">VIN</th>
                <th className="px-4 py-3 font-medium">Make / Model</th>
                <th className="px-4 py-3 font-medium">Year</th>
                <th className="px-4 py-3 font-medium">Buyer</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {allVehicles.map((vehicle) => (
                <tr
                  key={vehicle.id}
                  className="border-b border-neutral-100 last:border-0"
                >
                  <td className="px-4 py-3 font-medium text-neutral-900">
                    {vehicle.vin}
                  </td>
                  <td className="px-4 py-3 text-neutral-600">
                    {[vehicle.make, vehicle.model].filter(Boolean).join(" ") || "—"}
                  </td>
                  <td className="px-4 py-3 text-neutral-600">{vehicle.year ?? "—"}</td>
                  <td className="px-4 py-3 text-neutral-600">
                    {vehicle.buyerName ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        vehicle.active
                          ? "rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700"
                          : "rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-500"
                      }
                    >
                      {vehicle.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/vehicles/${vehicle.id}/edit`}
                        className="text-sm text-neutral-500 hover:text-neutral-900"
                      >
                        Edit
                      </Link>
                      <ToggleActiveButton id={vehicle.id} active={vehicle.active} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  );
}
