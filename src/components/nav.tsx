import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { NavBar } from "./nav-bar";

export async function Nav() {
  const session = await auth();
  if (!session?.user) return null;

  // A deactivated user's JWT still looks "logged in" until it naturally
  // expires — check the DB so the nav doesn't show them as authenticated
  // (matches the live check requireSession() does for actual page access).
  const [user] = await db
    .select({ active: users.active, role: users.role })
    .from(users)
    .where(eq(users.id, Number(session.user.id)))
    .limit(1);
  if (!user?.active) return null;

  return <NavBar name={session.user.name ?? ""} role={user.role} />;
}
