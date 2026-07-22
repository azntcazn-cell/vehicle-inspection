"use client";

import { useState, useTransition } from "react";
import { deleteUser } from "./actions";

export function DeleteUserButton({ id }: { id: number }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      const result = await deleteUser(id);
      if (result?.error) {
        setError(result.error);
        setConfirming(false);
      }
    });
  }

  if (confirming) {
    return (
      <span className="flex items-center gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={handleDelete}
          className="text-sm font-medium text-red-600 hover:text-red-800 disabled:opacity-50"
        >
          {pending ? "Deleting…" : "Confirm"}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="text-sm text-neutral-500 hover:text-neutral-900"
        >
          Cancel
        </button>
      </span>
    );
  }

  return (
    <span className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="text-sm text-red-500 hover:text-red-700"
      >
        Delete
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </span>
  );
}
