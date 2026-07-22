"use server";

import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireAdmin } from "@/lib/auth-helpers";
import { inspections } from "@/db/schema";
import { count } from "drizzle-orm";

const userSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z.string().trim().email("Valid email required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["admin", "inspector", "viewer"]),
});

export type UserFormState = { error?: string } | undefined;

export async function createUser(
  _prevState: UserFormState,
  formData: FormData
): Promise<UserFormState> {
  await requireAdmin();

  const parsed = userSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const existing = await db
    .select()
    .from(users)
    .where(eq(users.email, parsed.data.email))
    .limit(1);
  if (existing.length > 0) {
    return { error: "A user with that email already exists." };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  await db.insert(users).values({
    name: parsed.data.name,
    email: parsed.data.email,
    passwordHash,
    role: parsed.data.role,
  });

  revalidatePath("/admin/users");
  redirect("/admin/users");
}

export async function toggleUserActive(id: number, active: boolean) {
  await requireAdmin();
  await db.update(users).set({ active }).where(eq(users.id, id));
  revalidatePath("/admin/users");
}

export type DeleteUserResult = { error?: string } | undefined;

export async function deleteUser(id: number): Promise<DeleteUserResult> {
  const session = await requireAdmin();

  if (Number(session.user.id) === id) {
    return { error: "You can't delete your own account." };
  }

  // Inspections reference the inspector; deleting the user would orphan or
  // block on the foreign key. Preserve the audit trail — deactivate instead.
  const [{ value: inspectionCount }] = await db
    .select({ value: count() })
    .from(inspections)
    .where(eq(inspections.inspectorId, id));
  if (inspectionCount > 0) {
    return {
      error:
        "This user has inspections on record. Deactivate them instead to keep the history intact.",
    };
  }

  await db.delete(users).where(eq(users.id, id));
  revalidatePath("/admin/users");
  return undefined;
}
