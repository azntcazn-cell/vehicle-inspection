"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { vehicles } from "@/db/schema";
import { requireInspector } from "@/lib/auth-helpers";

const VIN_PATTERN = /^[A-HJ-NPR-Z0-9]{17}$/;

const vehicleSchema = z.object({
  make: z.string().trim().optional(),
  model: z.string().trim().optional(),
  year: z.coerce.number().int().optional(),
  buyerName: z.string().trim().optional(),
  vin: z
    .string()
    .trim()
    .toUpperCase()
    .regex(VIN_PATTERN, "VIN must be 17 characters (letters and numbers, no I/O/Q)"),
});

export type VehicleFormState = { error?: string } | undefined;

export type VinDecodeResult =
  | { make: string | null; model: string | null; year: number | null }
  | { error: string };

export async function decodeVin(vin: string): Promise<VinDecodeResult> {
  await requireInspector();

  const cleaned = vin.trim().toUpperCase();
  if (!VIN_PATTERN.test(cleaned)) {
    return { error: "Enter a valid 17-character VIN first." };
  }

  try {
    const res = await fetch(
      `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${cleaned}?format=json`,
      { signal: AbortSignal.timeout(10_000) }
    );
    if (!res.ok) throw new Error(`NHTSA responded ${res.status}`);
    const data = await res.json();
    const result = data.Results?.[0];

    const make = result?.Make ? titleCase(result.Make) : null;
    const model = result?.Model || null;
    const yearNum = Number(result?.ModelYear);
    const year = Number.isInteger(yearNum) && yearNum > 0 ? yearNum : null;

    if (!make && !model && !year) {
      return { error: "NHTSA has no data for this VIN." };
    }
    return { make, model, year };
  } catch {
    return { error: "VIN decode service unavailable. Try again later." };
  }
}

function titleCase(s: string) {
  return s
    .toLowerCase()
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function parseVehicleForm(formData: FormData) {
  return vehicleSchema.parse({
    make: formData.get("make") || undefined,
    model: formData.get("model") || undefined,
    year: formData.get("year") || undefined,
    buyerName: formData.get("buyerName") || undefined,
    vin: formData.get("vin"),
  });
}

export async function createVehicle(
  _prevState: VehicleFormState,
  formData: FormData
): Promise<VehicleFormState> {
  await requireInspector();

  let data;
  try {
    data = parseVehicleForm(formData);
  } catch {
    return { error: "Please enter a valid 17-character VIN." };
  }

  try {
    await db.insert(vehicles).values(data);
  } catch {
    return { error: "A vehicle with that VIN already exists." };
  }
  revalidatePath("/vehicles");
  redirect("/vehicles");
}

export async function updateVehicle(
  id: number,
  _prevState: VehicleFormState,
  formData: FormData
): Promise<VehicleFormState> {
  await requireInspector();

  let data;
  try {
    data = parseVehicleForm(formData);
  } catch {
    return { error: "Please enter a valid 17-character VIN." };
  }

  try {
    await db.update(vehicles).set(data).where(eq(vehicles.id, id));
  } catch {
    return { error: "A vehicle with that VIN already exists." };
  }
  revalidatePath("/vehicles");
  redirect("/vehicles");
}

export async function toggleVehicleActive(id: number, active: boolean) {
  await requireInspector();
  await db.update(vehicles).set({ active }).where(eq(vehicles.id, id));
  revalidatePath("/vehicles");
}
