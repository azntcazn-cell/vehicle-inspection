"use client";

import { useTransition } from "react";
import Link from "next/link";
import { deleteChecklistItem, moveChecklistItem } from "./actions";

export function ItemRowActions({
  id,
  isFirst,
  isLast,
}: {
  id: number;
  isFirst: boolean;
  isLast: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        disabled={pending || isFirst}
        onClick={() => startTransition(() => moveChecklistItem(id, "up"))}
        className="text-sm text-neutral-500 hover:text-neutral-900 disabled:opacity-30"
      >
        ↑
      </button>
      <button
        type="button"
        disabled={pending || isLast}
        onClick={() => startTransition(() => moveChecklistItem(id, "down"))}
        className="text-sm text-neutral-500 hover:text-neutral-900 disabled:opacity-30"
      >
        ↓
      </button>
      <Link
        href={`/admin/checklist/${id}/edit`}
        className="text-sm text-neutral-500 hover:text-neutral-900"
      >
        Edit
      </Link>
      <button
        type="button"
        disabled={pending}
        onClick={() => startTransition(() => deleteChecklistItem(id))}
        className="text-sm text-red-500 hover:text-red-700 disabled:opacity-30"
      >
        Delete
      </button>
    </div>
  );
}
