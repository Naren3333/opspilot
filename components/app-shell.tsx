"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bot,
  BookOpen,
  ClipboardCheck,
  FileSearch,
  FlaskConical,
  Settings,
  Shield,
  Ticket,
} from "lucide-react";

import { cn } from "@/lib/utils";

const navItems = [
  { label: "Chat", href: "chat", icon: Bot },
  { label: "Tickets", href: "tickets", icon: Ticket },
  { label: "Documents", href: "documents", icon: BookOpen },
  { label: "Approvals", href: "approvals", icon: ClipboardCheck },
  { label: "Traces", href: "admin/traces", icon: FileSearch },
  { label: "Evals", href: "admin/evals", icon: FlaskConical },
  { label: "Providers", href: "settings/providers", icon: Settings },
];

export function AppShell({
  slug,
  workspaceName,
  role,
  pendingApprovals,
  children,
}: {
  slug: string;
  workspaceName: string;
  role: string;
  pendingApprovals: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[1680px] gap-6 px-4 py-4 md:px-6">
      <aside className="hidden w-80 shrink-0 xl:block">
        <div className="sticky top-4 rounded-[2rem] border border-[var(--line)] bg-[linear-gradient(180deg,rgba(10,16,28,0.96),rgba(4,7,13,0.94))] p-6 shadow-[var(--shadow)]">
          <div className="rounded-[1.75rem] border border-[rgba(133,247,217,0.18)] bg-[radial-gradient(circle_at_top_left,rgba(133,247,217,0.16),transparent_55%),linear-gradient(180deg,rgba(13,23,38,0.98),rgba(8,14,24,0.92))] p-5">
            <div className="flex items-center justify-between">
              <p className="font-mono text-xs uppercase tracking-[0.34em] text-[var(--accent)]/80">OpsPilot</p>
              <span className="rounded-full border border-[rgba(133,247,217,0.22)] bg-[rgba(133,247,217,0.08)] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--accent)]">
                live
              </span>
            </div>
            <h1 className="mt-6 text-3xl font-semibold tracking-tight">{workspaceName}</h1>
            <div className="mt-4 flex items-center gap-2 text-sm text-[var(--muted)]">
              <Shield size={16} className="text-[var(--accent)]" />
              <span>{role} role</span>
            </div>
            <div className="mt-6 flex gap-3">
              <div className="h-2 flex-1 rounded-full bg-[linear-gradient(90deg,var(--accent),rgba(133,247,217,0.16))]" />
              <div className="h-2 w-20 rounded-full bg-[linear-gradient(90deg,var(--secondary),rgba(255,134,88,0.12))]" />
            </div>
          </div>

          <nav className="mt-6 space-y-2">
            {navItems.map((item) => {
              const href = `/w/${slug}/${item.href}`;
              const active = pathname === href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={href}
                  className={cn(
                    "group flex items-center justify-between rounded-[1.35rem] border px-4 py-3 text-sm font-medium transition duration-200",
                    active
                      ? "border-[rgba(133,247,217,0.26)] bg-[linear-gradient(90deg,rgba(133,247,217,0.16),rgba(133,247,217,0.05))] text-[var(--foreground)] shadow-[0_0_0_1px_rgba(133,247,217,0.06)]"
                      : "border-transparent bg-[rgba(255,255,255,0.03)] text-[var(--muted)] hover:border-[var(--line)] hover:bg-[rgba(255,255,255,0.05)] hover:text-[var(--foreground)]",
                  )}
                >
                  <span className="flex items-center gap-3">
                    <Icon size={17} className={active ? "text-[var(--accent)]" : "text-[var(--secondary)]"} />
                    {item.label}
                  </span>
                  {item.href === "approvals" && pendingApprovals > 0 ? (
                    <span className="rounded-full border border-[rgba(255,134,88,0.26)] bg-[rgba(255,134,88,0.14)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--secondary)]">
                      {pendingApprovals}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>

      <div className="min-w-0 flex-1 rounded-[2rem] border border-[var(--line)] bg-[rgba(4,8,14,0.44)] p-3 shadow-[var(--shadow)] backdrop-blur-sm md:p-5">
        {children}
      </div>
    </div>
  );
}
