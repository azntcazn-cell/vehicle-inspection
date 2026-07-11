import Link from "next/link";
import { and, desc, eq, gte, lte, inArray } from "drizzle-orm";
import { db } from "@/db";
import { inspections, vehicles, users, inspectionResults } from "@/db/schema";
import { requireSession } from "@/lib/auth-helpers";

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{
    vehicleId?: string;
    inspectorId?: string;
    status?: string;
    from?: string;
    to?: string;
  }>;
}) {
  await requireSession();
  const filters = await searchParams;

  const conditions = [];
  if (filters.vehicleId) {
    conditions.push(eq(inspections.vehicleId, Number(filters.vehicleId)));
  }
  if (filters.inspectorId) {
    conditions.push(eq(inspections.inspectorId, Number(filters.inspectorId)));
  }
  if (filters.status === "completed" || filters.status === "in_progress") {
    conditions.push(eq(inspections.status, filters.status));
  }
  if (filters.from) {
    conditions.push(gte(inspections.startedAt, filters.from));
  }
  if (filters.to) {
    conditions.push(lte(inspections.startedAt, `${filters.to}T23:59:59`));
  }

  const rows = await db
    .select({
      id: inspections.id,
      vehicleVin: vehicles.vin,
      inspectorName: users.name,
      status: inspections.status,
      startedAt: inspections.startedAt,
      completedAt: inspections.completedAt,
    })
    .from(inspections)
    .innerJoin(vehicles, eq(inspections.vehicleId, vehicles.id))
    .innerJoin(users, eq(inspections.inspectorId, users.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(inspections.startedAt));

  const failRows =
    rows.length > 0
      ? await db
          .selectDistinct({ inspectionId: inspectionResults.inspectionId })
          .from(inspectionResults)
          .where(
            and(
              eq(inspectionResults.status, "fail"),
              inArray(
                inspectionResults.inspectionId,
                rows.map((r) => r.id)
              )
            )
          )
      : [];
  const failSet = new Set(failRows.map((r) => r.inspectionId));

  const [allVehicles, allUsers] = await Promise.all([
    db.select({ id: vehicles.id, vin: vehicles.vin }).from(vehicles).orderBy(vehicles.vin),
    db.select({ id: users.id, name: users.name }).from(users).orderBy(users.name),
  ]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold text-neutral-900">History</h1>

      <form className="mb-6 flex flex-wrap items-end gap-3 rounded-lg border border-neutral-200 bg-white p-4">
        <FilterSelect
          name="vehicleId"
          label="Vehicle"
          value={filters.vehicleId}
          options={allVehicles.map((v) => ({ value: String(v.id), label: v.vin }))}
        />
        <FilterSelect
          name="inspectorId"
          label="Inspector"
          value={filters.inspectorId}
          options={allUsers.map((u) => ({ value: String(u.id), label: u.name }))}
        />
        <FilterSelect
          name="status"
          label="Status"
          value={filters.status}
          options={[
            { value: "completed", label: "Completed" },
            { value: "in_progress", label: "In progress" },
          ]}
        />
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-neutral-700">From</label>
          <input
            type="date"
            name="from"
            defaultValue={filters.from}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-neutral-700">To</label>
          <input
            type="date"
            name="to"
            defaultValue={filters.to}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-700"
        >
          Filter
        </button>
        <Link href="/history" className="text-sm text-neutral-500 hover:text-neutral-900">
          Clear
        </Link>
      </form>

      {rows.length === 0 ? (
        <p className="text-sm text-neutral-500">No inspections found.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-neutral-500">
              <tr>
                <th className="px-4 py-3 font-medium">Vehicle</th>
                <th className="px-4 py-3 font-medium">Inspector</th>
                <th className="px-4 py-3 font-medium">Started</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-neutral-100 last:border-0">
                  <td className="px-4 py-3 font-medium text-neutral-900">
                    {row.vehicleVin}
                  </td>
                  <td className="px-4 py-3 text-neutral-600">{row.inspectorName}</td>
                  <td className="px-4 py-3 text-neutral-600">
                    {new Date(row.startedAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-neutral-600">
                        {row.status === "completed" ? "Completed" : "In progress"}
                      </span>
                      {failSet.has(row.id) && (
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                          Failed items
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/history/${row.id}`}
                      className="text-sm text-neutral-500 hover:text-neutral-900"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function FilterSelect({
  name,
  label,
  value,
  options,
}: {
  name: string;
  label: string;
  value?: string;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-neutral-700">{label}</label>
      <select
        name={name}
        defaultValue={value ?? ""}
        className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
      >
        <option value="">All</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
