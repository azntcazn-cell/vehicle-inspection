import Link from "next/link";

export function VehicleSearch({ q, action }: { q?: string; action: string }) {
  return (
    <form action={action} className="mb-4 flex items-center gap-2">
      <input
        type="search"
        name="q"
        defaultValue={q ?? ""}
        placeholder="Search VIN, make, model, plate…"
        className="w-full rounded-md border border-neutral-300 px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-neutral-900 sm:max-w-xs"
      />
      <button
        type="submit"
        className="rounded-md border border-neutral-300 bg-white px-4 py-2 text-base font-medium text-neutral-700 transition hover:bg-neutral-100"
      >
        Search
      </button>
      {q && (
        <Link href={action} className="text-sm text-neutral-500 hover:text-neutral-900">
          Clear
        </Link>
      )}
    </form>
  );
}
