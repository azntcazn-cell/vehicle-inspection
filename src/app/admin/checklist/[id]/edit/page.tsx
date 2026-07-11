import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/db";
import { checklistItems } from "@/db/schema";
import { requireAdmin } from "@/lib/auth-helpers";
import { ItemForm } from "../../item-form";
import { updateChecklistItem } from "../../actions";

export default async function EditChecklistItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const itemId = Number(id);

  const [item] = await db
    .select()
    .from(checklistItems)
    .where(eq(checklistItems.id, itemId))
    .limit(1);

  if (!item) notFound();

  const boundUpdate = updateChecklistItem.bind(null, itemId);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold text-neutral-900">Edit Item</h1>
      <ItemForm
        action={boundUpdate}
        defaultCategory={item.category}
        defaultLabel={item.label}
        submitLabel="Save Changes"
      />
      <Link href="/admin/checklist" className="text-sm text-neutral-500 hover:text-neutral-900">
        Back to checklist
      </Link>
    </div>
  );
}
