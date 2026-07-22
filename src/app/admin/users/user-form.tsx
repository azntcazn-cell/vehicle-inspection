"use client";

import { useActionState } from "react";
import { createUser } from "./actions";

export function UserForm() {
  const [state, formAction, pending] = useActionState(createUser, undefined);

  return (
    <form
      action={formAction}
      className="mb-6 flex flex-wrap items-end gap-3 rounded-lg border border-neutral-200 bg-white p-4"
    >
      <div className="flex flex-col gap-1">
        <label htmlFor="name" className="text-sm font-medium text-neutral-700">
          Name
        </label>
        <input
          id="name"
          name="name"
          required
          className="rounded-md border border-neutral-300 px-3 py-2 text-base"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="email" className="text-sm font-medium text-neutral-700">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className="rounded-md border border-neutral-300 px-3 py-2 text-base"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="password" className="text-sm font-medium text-neutral-700">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          className="rounded-md border border-neutral-300 px-3 py-2 text-base"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="role" className="text-sm font-medium text-neutral-700">
          Role
        </label>
        <select
          id="role"
          name="role"
          defaultValue="inspector"
          className="rounded-md border border-neutral-300 px-3 py-2 text-base"
        >
          <option value="inspector">Inspector</option>
          <option value="viewer">Viewer</option>
          <option value="admin">Admin</option>
        </select>
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-700 disabled:opacity-50"
      >
        {pending ? "Adding…" : "Add User"}
      </button>
      {state?.error && (
        <p className="w-full text-sm text-red-600" role="alert">
          {state.error}
        </p>
      )}
    </form>
  );
}
