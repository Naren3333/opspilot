"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import {
  Bot,
  BookOpen,
  ClipboardCheck,
  FileSearch,
  FlaskConical,
  PanelLeftClose,
  PanelLeftOpen,
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

const STORAGE_KEY = "opspilot-shell-collapsed";

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
  const [collapsed, setCollapsed] = useState(
    () => typeof window !== "undefined" && window.localStorage.getItem(STORAGE_KEY) === "1",
  );

  function toggleCollapsed() {
    setCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      return next;
    });
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[1760px] gap-0 px-0">
      <aside
        className={cn(
          "hidden shrink-0 border-r border-[var(--line)] bg-[rgba(8,10,15,0.9)] transition-[width] duration-200 xl:flex xl:flex-col",
          collapsed ? "w-[4.5rem]" : "w-[15.5rem]",
        )}
      >
        <div
          className={cn(
            "flex items-center border-b border-[var(--line)] px-3 py-4",
            collapsed ? "justify-center" : "justify-between",
          )}
        >
          {!collapsed ? (
            <div className="min-w-0">
              <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-[var(--muted)]">OpsPilot</p>
              <p className="mt-3 truncate text-base font-semibold text-[var(--foreground)]">{workspaceName}</p>
              <p className="mt-1 text-sm text-[var(--muted)]">{role}</p>
            </div>
          ) : null}

          <button
            type="button"
            onClick={toggleCollapsed}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-[var(--muted)] transition hover:bg-[rgba(255,255,255,0.04)] hover:text-[var(--foreground)]"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-2 py-3">
          {navItems.map((item) => {
            const href = `/w/${slug}/${item.href}`;
            const active = pathname === href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={href}
                className={cn(
                  "flex items-center rounded-xl px-3 py-2.5 text-sm transition",
                  collapsed ? "justify-center" : "justify-between",
                  active
                    ? "bg-[rgba(255,255,255,0.06)] text-[var(--foreground)]"
                    : "text-[var(--muted)] hover:bg-[rgba(255,255,255,0.03)] hover:text-[var(--foreground)]",
                )}
                title={collapsed ? item.label : undefined}
              >
                <span className={cn("flex items-center", collapsed ? "justify-center" : "gap-3")}>
                  <Icon size={16} className={active ? "text-[var(--foreground)]" : "text-[var(--muted)]"} />
                  {!collapsed ? <span>{item.label}</span> : null}
                </span>
                {!collapsed && item.href === "approvals" && pendingApprovals > 0 ? (
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
