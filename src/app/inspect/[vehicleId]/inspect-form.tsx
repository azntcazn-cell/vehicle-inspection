"use client";

import { useActionState } from "react";
import type { InspectionFormState } from "../actions";
import { MediaUpload } from "./media-upload";
import { VehicleDiagram } from "./vehicle-diagram";

type ChecklistItem = {
  id: number;
  category: string;
  label: string;
};

type MediaItem = { url: string; type: "image" | "video" };

type InitialItemData = {
  status: "pass" | "fail" | "na";
  notes: string | null;
  media: MediaItem[];
};

export type InspectFormInitialData = {
  odometer?: number | null;
  notes?: string | null;
  diagramUrl?: string | null;
  diagramLabels?: { x: number; y: number; text: string }[];
  itemsById?: Record<number, InitialItemData>;
};

export function InspectForm({
  action,
  itemsByCategory,
  initialData,
  submitLabel = "Complete Inspection",
}: {
  action: (
    state: InspectionFormState,
    formData: FormData
  ) => Promise<InspectionFormState>;
  itemsByCategory: [string, ChecklistItem[]][];
  initialData?: InspectFormInitialData;
  submitLabel?: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-8">
      <div className="flex flex-col gap-1 max-w-xs">
        <label htmlFor="odometer" className="text-sm font-medium text-neutral-700">
          Odometer
        </label>
        <input
          id="odometer"
          name="odometer"
          type="number"
          defaultValue={initialData?.odometer ?? ""}
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
        />
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-neutral-700">Vehicle Diagram</p>
        <VehicleDiagram
          initialImageUrl={initialData?.diagramUrl ?? undefined}
          initialLabels={initialData?.diagramLabels}
        />
      </div>

      {itemsByCategory.map(([category, items]) => (
        <fieldset key={category} className="flex flex-col gap-4">
          <legend className="mb-2 text-sm font-semibold text-neutral-900">
            {category}
          </legend>
          {items.map((item) => {
            const initialItem = initialData?.itemsById?.[item.id];
            return (
              <div
                key={item.id}
                className="rounded-lg border border-neutral-200 bg-white p-4"
              >
                <p className="mb-2 text-sm font-medium text-neutral-900">
                  {item.label}
                </p>
                <div className="flex gap-4 mb-2">
                  {(["pass", "fail", "na"] as const).map((value, i) => (
                    <label
                      key={value}
                      className="flex items-center gap-1.5 text-sm text-neutral-600"
                    >
                      <input
                        type="radio"
                        name={`item-${item.id}`}
                        value={value}
                        required={i === 0}
                        defaultChecked={initialItem?.status === value}
                      />
                      {value === "pass" ? "Pass" : value === "fail" ? "Fail" : "N/A"}
                    </label>
                  ))}
                </div>
                <input
                  type="text"
                  name={`notes-${item.id}`}
                  placeholder="Notes (optional)"
                  defaultValue={initialItem?.notes ?? ""}
                  className="w-full rounded-md border border-neutral-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
                <MediaUpload itemId={item.id} initialMedia={initialItem?.media} />
              </div>
            );
          })}
        </fieldset>
      ))}

      <div className="flex flex-col gap-1">
        <label htmlFor="notes" className="text-sm font-medium text-neutral-700">
          Overall notes
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          defaultValue={initialData?.notes ?? ""}
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
        />
      </div>

      {state?.error && (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-md bg-neutral-900 px-6 py-2 text-sm font-medium text-white transition hover:bg-neutral-700 disabled:opacity-50"
      >
        {pending ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}
