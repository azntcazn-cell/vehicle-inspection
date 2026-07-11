"use server";

import { and, asc, desc, eq, gt, lt, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { checklistItems } from "@/db/schema";
import { requireAdmin } from "@/lib/auth-helpers";

const itemSchema = z.object({
  category: z.string().trim().min(1, "Category is required"),
  label: z.string().trim().min(1, "Label is required"),
});

export type ItemFormState = { error?: string } | undefined;

function parseItemForm(formData: FormData) {
  return itemSchema.safeParse({
    category: formData.get("category"),
    label: formData.get("label"),
  });
}

export async function createChecklistItem(
  templateId: number,
  _prevState: ItemFormState,
  formData: FormData
): Promise<ItemFormState> {
  await requireAdmin();

  const parsed = parseItemForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const [maxRow] = await db
    .select({ max: sql<number>`max(${checklistItems.sortOrder})` })
    .from(checklistItems)
    .where(eq(checklistItems.templateId, templateId));
  const nextOrder = (maxRow?.max ?? -1) + 1;

  await db.insert(checklistItems).values({
    templateId,
    category: parsed.data.category,
    label: parsed.data.label,
    sortOrder: nextOrder,
  });

  revalidatePath("/admin/checklist");
  redirect("/admin/checklist");
}

export async function updateChecklistItem(
  id: number,
  _prevState: ItemFormState,
  formData: FormData
): Promise<ItemFormState> {
  await requireAdmin();

  const parsed = parseItemForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  await db.update(checklistItems).set(parsed.data).where(eq(checklistItems.id, id));
  revalidatePath("/admin/checklist");
  redirect("/admin/checklist");
}

export async function deleteChecklistItem(id: number) {
  await requireAdmin();
  await db.delete(checklistItems).where(eq(checklistItems.id, id));
  revalidatePath("/admin/checklist");
}

export async function moveChecklistItem(id: number, direction: "up" | "down") {
  await requireAdmin();

  const [item] = await db
    .select()
    .from(checklistItems)
    .where(eq(checklistItems.id, id))
    .limit(1);
  if (!item) return;

  const neighbor =
    direction === "up"
      ? await db
          .select()
          .from(checklistItems)
          .where(
            and(
              eq(checklistItems.templateId, item.templateId),
              lt(checklistItems.sortOrder, item.sortOrder)
            )
          )
          .orderBy(desc(checklistItems.sortOrder))
          .limit(1)
      : await db
          .select()
          .from(checklistItems)
          .where(
            and(
              eq(checklistItems.templateId, item.templateId),
              gt(checklistItems.sortOrder, item.sortOrder)
            )
          )
          .orderBy(asc(checklistItems.sortOrder))
          .limit(1);

  if (neighbor.length === 0) return;

  await db
    .update(checklistItems)
    .set({ sortOrder: neighbor[0].sortOrder })
    .where(eq(checklistItems.id, item.id));
  await db
    .update(checklistItems)
    .set({ sortOrder: item.sortOrder })
    .where(eq(checklistItems.id, neighbor[0].id));

  revalidatePath("/admin/checklist");
}
