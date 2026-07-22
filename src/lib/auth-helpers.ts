import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";

export async function requireSession() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // The JWT is only re-issued at login, so a deactivated user or a role
  // change made by an admin wouldn't otherwise take effect until the
  // affected user's session naturally expires. Re-check against the
  // database on every call so revocation and role changes are immediate.
  const [user] = await db
    .select({ active: users.active, role: users.role })
    .from(users)
    .where(eq(users.id, Number(session.user.id)))
    .limit(1);

  if (!user || !user.active) redirect("/login");

  session.user.role = user.role;
  return session;
}

export async function requireAdmin() {
  const session = await requireSession();
  if (session.user.role !== "admin") redirect("/");
  return session;
}

// Admins and inspectors can manage vehicles and run inspections; viewers
// have read-only access.
export async function requireInspector() {
  const session = await requireSession();
  if (session.user.role === "viewer") redirect("/");
  return session;
}

export function canInspect(role: "admin" | "inspector" | "viewer") {
  return role !== "viewer";
}

export function canEditInspection(
  session: { user: { id: string; role: "admin" | "inspector" | "viewer" } },
  inspectorId: number
) {
  if (session.user.role === "viewer") return false;
  return session.user.role === "admin" || Number(session.user.id) === inspectorId;
}
