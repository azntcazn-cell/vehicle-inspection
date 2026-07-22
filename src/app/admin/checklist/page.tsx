import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { checklistTemplates, checklistItems } from "@/db/schema";
import { requireAdmin } from "@/lib/auth-helpers";
import { ItemForm } from "./item-form";
import { ItemRowActions } from "./item-row-actions";
import { createChecklistItem } from "./actions";

export default async function AdminChecklistPage() {
  await requireAdmin();

  const [template] = await db
    .select()
    .from(checklistTemplates)
    .orderBy(checklistTemplates.id)
    .limit(1);

  const items = template
    ? await db
        .select()
        .from(checklistItems)
        .where(
          and(
            eq(checklistItems.templateId, template.id),
            eq(checklistItems.active, true)
          )
        )
        .orderBy(checklistItems.sortOrder)
    : [];

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-1 text-2xl font-semibold text-neutral-900">Checklist</h1>
      <p className="mb-6 text-sm text-neutral-500">
        {template ? template.name : "No checklist template found."}
      </p>

      {template && (
        <>
          <ItemForm action={createChecklistItem.bind(null, template.id)} submitLabel="Add Item" />

          <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
            <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-neutral-200 bg-neutral-50 text-neutral-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Item</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <tr key={item.id} className="border-b border-neutral-100 last:border-0">
                    <td className="px-4 py-3 text-neutral-600">{item.category}</td>
                    <td className="px-4 py-3 font-medium text-neutral-900">
                      {item.label}
                    </td>
                    <td className="px-4 py-3">
                      <ItemRowActions
                        id={item.id}
                        isFirst={i === 0}
                        isLast={i === items.length - 1}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
