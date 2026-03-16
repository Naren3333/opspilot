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
    <div className="mx-auto flex min-h-screen w-full max-w-[1600px] gap-6 px-4 py-4 md:px-6">
      <aside className="hidden w-72 shrink-0 rounded-[2rem] border border-[var(--line)] bg-[var(--card)] p-6 shadow-[var(--shadow)] xl:block">
        <div className="rounded-[1.5rem] bg-[var(--foreground)] p-5 text-white">
          <p className="font-mono text-xs uppercase tracking-[0.28em] text-white/70">Workspace</p>
          <h1 className="mt-3 text-2xl font-semibold">{workspaceName}</h1>
          <div className="mt-4 flex items-center gap-2 text-sm text-white/80">
            <Shield size={16} />
            <span>{role} role</span>
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
                  "flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-medium transition",
                  active
                    ? "bg-[var(--accent)] text-white"
                    : "bg-white/60 text-[var(--foreground)] hover:bg-white",
                )}
              >
                <span className="flex items-center gap-3">
                  <Icon size={17} />
                  {item.label}
                </span>
                {item.href === "approvals" && pendingApprovals > 0 ? (
                  <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs">{pendingApprovals}</span>
                ) : null}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
