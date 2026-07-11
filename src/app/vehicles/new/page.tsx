import { requireAdmin } from "@/lib/auth-helpers";
import { VehicleForm } from "../vehicle-form";
import { createVehicle } from "../actions";

export default async function NewVehiclePage() {
  await requireAdmin();

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold text-neutral-900">Add Vehicle</h1>
      <VehicleForm action={createVehicle} submitLabel="Add Vehicle" />
    </div>
  );
}
