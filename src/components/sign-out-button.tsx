import { signOutAction } from "./actions";

export function SignOutButton() {
  return (
    <form action={signOutAction}>
      <button
        type="submit"
        className="text-sm text-neutral-500 transition hover:text-neutral-900"
      >
        Sign out
      </button>
    </form>
  );
}
