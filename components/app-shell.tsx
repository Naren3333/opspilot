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
    <div className="mx-auto flex min-h-screen w-full max-w-[1680px] gap-0 px-0">
      <aside className="hidden w-[15.5rem] shrink-0 border-r border-[var(--line)] bg-[rgba(8,10,15,0.9)] xl:flex xl:flex-col">
        <div className="px-5 pb-4 pt-6">
          <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-[var(--muted)]">OpsPilot</p>
          <p className="mt-4 truncate text-base font-semibold text-[var(--foreground)]">{workspaceName}</p>
          <p className="mt-1 text-sm text-[var(--muted)]">{role}</p>
        </div>

        <nav className="flex-1 space-y-1 px-3 pb-5">
          {navItems.map((item) => {
            const href = `/w/${slug}/${item.href}`;
            const active = pathname === href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={href}
                className={cn(
                  "flex items-center justify-between rounded-xl px-3 py-2.5 text-sm transition",
                  active
                    ? "bg-[rgba(255,255,255,0.06)] text-[var(--foreground)]"
                    : "text-[var(--muted)] hover:bg-[rgba(255,255,255,0.03)] hover:text-[var(--foreground)]",
                )}
              >
                <span className="flex items-center gap-3">
                  <Icon size={16} className={active ? "text-[var(--foreground)]" : "text-[var(--muted)]"} />
                  {item.label}
                </span>
                {item.href === "approvals" && pendingApprovals > 0 ? (
                  <span className="rounded-full bg-[rgba(255,194,107,0.12)] px-2 py-0.5 text-[11px] text-[var(--warning)]">
                    {pendingApprovals}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="min-w-0 flex-1 px-4 py-4 md:px-5">{children}</div>
    </div>
  );
}
