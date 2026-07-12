import { db } from "@/db";
import { users } from "@/db/schema";
import { requireAdmin } from "@/lib/auth-helpers";
import { UserForm } from "./user-form";
import { ToggleUserActiveButton } from "./toggle-user-active-button";

export default async function AdminUsersPage() {
  await requireAdmin();

  const allUsers = await db.select().from(users).orderBy(users.name);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold text-neutral-900">Users</h1>

      <UserForm />

      <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
        <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-neutral-500">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {allUsers.map((user) => (
              <tr key={user.id} className="border-b border-neutral-100 last:border-0">
                <td className="px-4 py-3 font-medium text-neutral-900">{user.name}</td>
                <td className="px-4 py-3 text-neutral-600">{user.email}</td>
                <td className="px-4 py-3 text-neutral-600 capitalize">{user.role}</td>
                <td className="px-4 py-3">
                  <span
                    className={
                      user.active
                        ? "rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700"
                        : "rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-500"
                    }
                  >
                    {user.active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <ToggleUserActiveButton id={user.id} active={user.active} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
