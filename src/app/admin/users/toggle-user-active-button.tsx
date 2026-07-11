"use client";

import { useTransition } from "react";
import { toggleUserActive } from "./actions";

export function ToggleUserActiveButton({
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
      onClick={() => startTransition(() => toggleUserActive(id, !active))}
      className="text-sm text-neutral-500 hover:text-neutral-900 disabled:opacity-50"
    >
      {active ? "Deactivate" : "Reactivate"}
    </button>
  );
}
