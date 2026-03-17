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
  { label: "Review", href: "chat", icon: Bot },
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
    <div className="mx-auto flex min-h-screen w-full max-w-[1720px] gap-5 px-4 py-4 md:px-5">
      <aside className="hidden w-[18.5rem] shrink-0 xl:block">
        <div className="sticky top-4 rounded-[1.9rem] border border-[var(--line)] bg-[linear-gradient(180deg,rgba(9,12,19,0.99),rgba(5,8,14,0.97))] p-4 shadow-[var(--shadow)]">
          <div className="rounded-[1.5rem] border border-[rgba(129,180,255,0.16)] bg-[linear-gradient(180deg,rgba(14,19,30,0.98),rgba(8,11,18,0.94))] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.34em] text-[var(--muted)]">
                  OpsPilot
                </p>
                <p className="mt-2 text-lg font-semibold tracking-tight">Agent workspace</p>
              </div>
              <span className="rounded-full border border-[rgba(133,247,217,0.2)] bg-[rgba(133,247,217,0.08)] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--accent)]">
                live
              </span>
            </div>
            <h1 className="mt-6 text-2xl font-semibold tracking-tight">{workspaceName}</h1>
            <div className="mt-4 grid gap-3">
              <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
                <Shield size={16} className="text-[var(--accent)]" />
                <span>{role} role</span>
              </div>
              <div className="rounded-[1rem] border border-[var(--line)] bg-[rgba(255,255,255,0.03)] px-3 py-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--muted)]">Mode</p>
                <p className="mt-2 text-sm font-medium text-[var(--foreground)]">Review-first agent</p>
              </div>
            </div>
            <div className="mt-6 flex gap-2">
              <div className="h-1.5 flex-1 rounded-full bg-[linear-gradient(90deg,#7af5df,rgba(122,245,223,0.12))]" />
              <div className="h-1.5 w-20 rounded-full bg-[linear-gradient(90deg,#81b4ff,rgba(129,180,255,0.12))]" />
            </div>
          </div>

          <nav className="mt-4 space-y-1.5">
            {navItems.map((item) => {
              const href = `/w/${slug}/${item.href}`;
              const active = pathname === href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={href}
                  className={cn(
                    "group flex items-center justify-between rounded-[1.15rem] border px-3.5 py-3 text-sm font-medium transition duration-200",
                    active
                      ? "border-[rgba(129,180,255,0.22)] bg-[linear-gradient(90deg,rgba(129,180,255,0.14),rgba(122,245,223,0.06))] text-[var(--foreground)] shadow-[0_0_0_1px_rgba(129,180,255,0.04)]"
                      : "border-transparent bg-[rgba(255,255,255,0.02)] text-[var(--muted)] hover:border-[var(--line)] hover:bg-[rgba(255,255,255,0.04)] hover:text-[var(--foreground)]",
                  )}
                >
                  <span className="flex items-center gap-3">
                    <Icon
                      size={17}
                      className={active ? "text-[var(--accent)]" : "text-[#81b4ff]"}
                    />
                    {item.label}
                  </span>
                  {item.href === "approvals" && pendingApprovals > 0 ? (
                    <span className="rounded-full border border-[rgba(255,194,107,0.2)] bg-[rgba(255,194,107,0.1)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--warning)]">
                      {pendingApprovals}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>

      <div className="min-w-0 flex-1 rounded-[1.9rem] border border-[var(--line)] bg-[rgba(4,8,14,0.42)] p-3 shadow-[var(--shadow)] backdrop-blur-sm md:p-4">
        {children}
      </div>
    </div>
  );
}
