import Link from "next/link";
import { auth } from "@/auth";
import { SignOutButton } from "./sign-out-button";

export async function Nav() {
  const session = await auth();
  if (!session?.user) return null;

  const isAdmin = session.user.role === "admin";

  return (
    <nav className="border-b border-neutral-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-6">
          <Link href="/" className="font-semibold text-neutral-900">
            Vehicle Inspections
          </Link>
          <Link href="/" className="text-sm text-neutral-600 hover:text-neutral-900">
            Dashboard
          </Link>
          <Link
            href="/history"
            className="text-sm text-neutral-600 hover:text-neutral-900"
          >
            History
          </Link>
          {isAdmin && (
            <>
              <Link
                href="/vehicles"
                className="text-sm text-neutral-600 hover:text-neutral-900"
              >
                Vehicles
              </Link>
              <Link
                href="/admin/users"
                className="text-sm text-neutral-600 hover:text-neutral-900"
              >
                Users
              </Link>
              <Link
                href="/admin/checklist"
                className="text-sm text-neutral-600 hover:text-neutral-900"
              >
                Checklist
              </Link>
            </>
          )}
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-neutral-500">{session.user.name}</span>
          <SignOutButton />
        </div>
      </div>
    </nav>
  );
}
