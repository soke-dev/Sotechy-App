import type { ReactNode } from "react";
import { ROLE_LABELS } from "@sotechy/shared";
import { AdminShell } from "@/components/admin-shell";
import { getCurrentUser } from "@/lib/api";
import { logout } from "./actions";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  return (
    <AdminShell user={{ name: user.fullName ?? user.email, email: user.email, role: ROLE_LABELS[user.role] }} signOut={logout}>
      {children}
    </AdminShell>
  );
}
