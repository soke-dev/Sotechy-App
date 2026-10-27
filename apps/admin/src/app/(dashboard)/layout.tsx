import type { ReactNode } from "react";
import { ROLE_LABELS } from "@sotechy/shared";
import { AdminShell } from "@/components/admin-shell";
import { QueueProvider, type Queue } from "@/components/queue-context";
import { getCurrentUser, load } from "@/lib/api";
import { logout } from "./actions";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const [user, queue] = await Promise.all([getCurrentUser(), load<Queue>("/admin/queue")]);
  return (
    <QueueProvider value={queue.data ?? { merchants: 0, zones: 0, cases: 0 }}>
      <AdminShell user={{ name: user.fullName ?? user.email, email: user.email, role: ROLE_LABELS[user.role] }} signOut={logout}>
        {children}
      </AdminShell>
    </QueueProvider>
  );
}
