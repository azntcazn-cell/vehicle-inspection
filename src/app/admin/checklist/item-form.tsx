"use client";

import { useActionState } from "react";
import type { ItemFormState } from "./actions";

export function ItemForm({
  action,
  defaultCategory,
  defaultLabel,
  submitLabel,
}: {
  action: (state: ItemFormState, formData: FormData) => Promise<ItemFormState>;
  defaultCategory?: string;
  defaultLabel?: string;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form
      action={formAction}
      className="mb-6 flex flex-wrap items-end gap-3 rounded-lg border border-neutral-200 bg-white p-4"
    >
      <div className="flex flex-col gap-1">
        <label htmlFor="category" className="text-sm font-medium text-neutral-700">
          Category
        </label>
        <input
          id="category"
          name="category"
          required
          defaultValue={defaultCategory}
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="label" className="text-sm font-medium text-neutral-700">
          Item label
        </label>
        <input
          id="label"
          name="label"
          required
          defaultValue={defaultLabel}
          className="min-w-64 rounded-md border border-neutral-300 px-3 py-2 text-sm"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-700 disabled:opacity-50"
      >
        {pending ? "Saving…" : submitLabel}
      </button>
      {state?.error && (
        <p className="w-full text-sm text-red-600" role="alert">
          {state.error}
        </p>
      )}
    </form>
  );
}
