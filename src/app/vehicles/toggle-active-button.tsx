"use client";

import { useTransition } from "react";
import { toggleVehicleActive } from "./actions";

export function ToggleActiveButton({
  id,
  active,
}: {
  id: number;
  active: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => toggleVehicleActive(id, !active))}
      className="text-sm text-neutral-500 hover:text-neutral-900 disabled:opacity-50"
    >
      {active ? "Deactivate" : "Reactivate"}
    </button>
  );
}
