import { notFound } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { getCurrentUserEmail } from "@/lib/auth";
import { getWorkspaceRole, getWorkspaceSnapshot } from "@/lib/data/repository";

export default async function WorkspaceLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}>) {
  const { slug } = await params;
  const snapshot = await getWorkspaceSnapshot(slug);
  if (!snapshot) {
    notFound();
  }

  const email = await getCurrentUserEmail();
  const role = await getWorkspaceRole(slug, email);
  const pendingApprovals = snapshot.approvals.filter((approval) => approval.status === "pending").length;

  return (
    <AppShell
      slug={slug}
      workspaceName={snapshot.workspace.name}
      role={role}
      pendingApprovals={pendingApprovals}
    >
      {children}
    </AppShell>
  );
}
