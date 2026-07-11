import { redirect } from "next/navigation";
import { auth } from "@/auth";

export async function requireSession() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return session;
}

export async function requireAdmin() {
  const session = await requireSession();
  if (session.user.role !== "admin") redirect("/");
  return session;
}

export function canEditInspection(
  session: { user: { id: string; role: "admin" | "inspector" } },
  inspectorId: number
) {
  return session.user.role === "admin" || Number(session.user.id) === inspectorId;
}
