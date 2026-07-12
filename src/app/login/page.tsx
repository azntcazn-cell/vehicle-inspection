import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;

  // Skip the form for an already-active session, but check the DB rather
  // than trusting the JWT alone — a deactivated user's token still looks
  // "logged in" and must be allowed to land here, not bounced away.
  const session = await auth();
  if (session?.user) {
    const [user] = await db
      .select({ active: users.active })
      .from(users)
      .where(eq(users.id, Number(session.user.id)))
      .limit(1);
    if (user?.active) redirect(callbackUrl || "/");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-sm rounded-lg border border-neutral-200 bg-white p-8 shadow-sm">
        <h1 className="mb-1 text-xl font-semibold text-neutral-900">
          Vehicle Inspections
        </h1>
        <p className="mb-6 text-sm text-neutral-500">Sign in to continue</p>
        <LoginForm callbackUrl={callbackUrl ?? "/"} />
      </div>
    </div>
  );
}
