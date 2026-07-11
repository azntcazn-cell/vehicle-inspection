import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { vehicles } from "@/db/schema";
import { requireAdmin } from "@/lib/auth-helpers";
import { VehicleForm } from "../../vehicle-form";
import { updateVehicle } from "../../actions";

export default async function EditVehiclePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const vehicleId = Number(id);

  const [vehicle] = await db
    .select()
    .from(vehicles)
    .where(eq(vehicles.id, vehicleId))
    .limit(1);

  if (!vehicle) notFound();

  const boundUpdate = updateVehicle.bind(null, vehicleId);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold text-neutral-900">Edit Vehicle</h1>
      <VehicleForm action={boundUpdate} vehicle={vehicle} submitLabel="Save Changes" />
    </div>
  );
}
