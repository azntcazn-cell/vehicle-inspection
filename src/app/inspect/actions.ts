"use server";

import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import {
  checklistItems,
  inspections,
  inspectionResults,
  inspectionMedia,
} from "@/db/schema";
import {
  requireSession,
  requireInspector,
  canEditInspection,
} from "@/lib/auth-helpers";
import { storeMedia } from "@/lib/media-storage";

export type InspectionFormState = { error?: string } | undefined;

const MAX_FILE_BYTES = 25 * 1024 * 1024; // 25MB

export async function uploadInspectionMedia(
  formData: FormData
): Promise<{ url: string; type: "image" | "video" }> {
  await requireInspector();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("No file provided.");
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new Error("File is too large (25MB max).");
  }
  if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
    throw new Error("Only image or video files are allowed.");
  }

  const url = await storeMedia(file);
  const type = file.type.startsWith("video/") ? "video" : "image";
  return { url, type };
}

type ParsedInspectionForm = {
  odometer: number | null;
  notes: string | null;
  diagramUrl: string | null;
  diagramLabels: string | null;
  results: {
    itemId: number;
    status: "pass" | "fail" | "na";
    notes: string | null;
    media: { url: string; type: "image" | "video" }[];
  }[];
};

async function parseInspectionForm(
  templateId: number,
  formData: FormData
): Promise<ParsedInspectionForm | { error: string }> {
  const odometerRaw = formData.get("odometer");
  const odometer = odometerRaw ? Number(odometerRaw) : null;
  const notes = (formData.get("notes") as string) || null;
  const diagramUrl = (formData.get("diagramUrl") as string) || null;

  let diagramLabels: string | null = null;
  const diagramLabelsRaw = formData.get("diagramLabels");
  if (typeof diagramLabelsRaw === "string" && diagramLabelsRaw) {
    try {
      const parsed = JSON.parse(diagramLabelsRaw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        diagramLabels = JSON.stringify(parsed);
      }
    } catch {
      diagramLabels = null;
    }
  }

  const items = await db
    .select()
    .from(checklistItems)
    .where(
      and(
        eq(checklistItems.templateId, templateId),
        eq(checklistItems.active, true)
      )
    );

  const results: ParsedInspectionForm["results"] = [];

  for (const item of items) {
    const status = formData.get(`item-${item.id}`);
    if (status !== "pass" && status !== "fail" && status !== "na") {
      return { error: "Please mark a status for every checklist item." };
    }
    const itemNotes = (formData.get(`notes-${item.id}`) as string) || null;

    let media: { url: string; type: "image" | "video" }[] = [];
    const mediaRaw = formData.get(`media-${item.id}`);
    if (typeof mediaRaw === "string" && mediaRaw) {
      try {
        media = JSON.parse(mediaRaw);
      } catch {
        media = [];
      }
    }

    results.push({ itemId: item.id, status, notes: itemNotes, media });
  }

  return { odometer, notes, diagramUrl, diagramLabels, results };
}

async function saveInspectionResults(
  inspectionId: number,
  results: ParsedInspectionForm["results"]
) {
  const insertedResults = await db
    .insert(inspectionResults)
    .values(
      results.map((r) => ({
        inspectionId,
        itemId: r.itemId,
        status: r.status,
        notes: r.notes,
      }))
    )
    .returning();

  const mediaRows = insertedResults.flatMap((inserted) => {
    const source = results.find((r) => r.itemId === inserted.itemId);
    return (source?.media ?? []).map((m) => ({
      resultId: inserted.id,
      url: m.url,
      type: m.type,
    }));
  });

  if (mediaRows.length > 0) {
    await db.insert(inspectionMedia).values(mediaRows);
  }
}

export async function submitInspection(
  vehicleId: number,
  templateId: number,
  _prevState: InspectionFormState,
  formData: FormData
): Promise<InspectionFormState> {
  const session = await requireInspector();

  const parsed = await parseInspectionForm(templateId, formData);
  if ("error" in parsed) return parsed;

  const [inspection] = await db
    .insert(inspections)
    .values({
      vehicleId,
      inspectorId: Number(session.user.id),
      templateId,
      odometer: parsed.odometer,
      status: "completed",
      notes: parsed.notes,
      diagramUrl: parsed.diagramUrl,
      diagramLabels: parsed.diagramLabels,
      completedAt: new Date().toISOString(),
    })
    .returning();

  await saveInspectionResults(inspection.id, parsed.results);

  revalidatePath("/history");
  revalidatePath("/");
  redirect(`/history/${inspection.id}`);
}

export async function updateInspection(
  inspectionId: number,
  templateId: number,
  _prevState: InspectionFormState,
  formData: FormData
): Promise<InspectionFormState> {
  const session = await requireSession();

  const [existing] = await db
    .select()
    .from(inspections)
    .where(eq(inspections.id, inspectionId))
    .limit(1);
  if (!existing) return { error: "Inspection not found." };
  if (!canEditInspection(session, existing.inspectorId)) {
    return { error: "You don't have permission to edit this inspection." };
  }

  const parsed = await parseInspectionForm(templateId, formData);
  if ("error" in parsed) return parsed;

  await db
    .update(inspections)
    .set({
      odometer: parsed.odometer,
      notes: parsed.notes,
      diagramUrl: parsed.diagramUrl,
      diagramLabels: parsed.diagramLabels,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(inspections.id, inspectionId));

  // Replace results/media wholesale rather than diffing — simpler and
  // cascade-deletes the old inspection_media rows along with the results.
  await db.delete(inspectionResults).where(eq(inspectionResults.inspectionId, inspectionId));
  await saveInspectionResults(inspectionId, parsed.results);

  revalidatePath("/history");
  revalidatePath(`/history/${inspectionId}`);
  revalidatePath("/");
  redirect(`/history/${inspectionId}`);
}
