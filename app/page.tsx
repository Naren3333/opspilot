import Link from "next/link";
import { ShieldCheck, Sparkles, Waypoints } from "lucide-react";

import { env } from "@/lib/env";

const highlights = [
  {
    title: "Approval-first automation",
    body: "Draft replies, create tickets, and suggest escalations without letting the model mutate records on its own.",
    icon: ShieldCheck,
  },
  {
    title: "Trace every run",
    body: "Inspect retrieved context, model decisions, tool proposals, and audit events from one control plane.",
    icon: Waypoints,
  },
  {
    title: "Bring your own model",
    body: "Develop locally with Ollama, then swap to any OpenAI-compatible provider with workspace-level secrets.",
    icon: Sparkles,
  },
];

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-8 md:px-10">
      <header className="mb-12 flex items-center justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.36em] text-[var(--accent)]/80">
            OpsPilot v1
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">Support ops, made inspectable.</h1>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/login"
            className="rounded-full border border-[var(--line)] bg-[rgba(255,255,255,0.04)] px-5 py-2.5 text-sm font-medium backdrop-blur-sm transition hover:border-[var(--accent)] hover:bg-[rgba(255,255,255,0.07)]"
          >
            Sign in
          </Link>
          <Link
            href={`/w/${env.demoWorkspaceSlug}/chat`}
            className="rounded-full bg-[linear-gradient(135deg,var(--accent),#56d8ff)] px-5 py-2.5 text-sm font-medium text-[var(--accent-ink)] transition hover:shadow-[0_0_24px_rgba(133,247,217,0.24)]"
          >
            Open demo workspace
          </Link>
        </div>
      </header>

      <section className="grid gap-8 lg:grid-cols-[1.5fr_1fr]">
        <div className="rounded-[2rem] border border-[var(--line)] bg-[radial-gradient(circle_at_top_left,rgba(133,247,217,0.14),transparent_46%),linear-gradient(180deg,rgba(11,18,30,0.96),rgba(6,10,18,0.92))] p-8 shadow-[var(--shadow)] backdrop-blur-sm md:p-10">
          <p className="inline-flex rounded-full border border-[var(--accent-soft)] bg-[var(--accent-soft)] px-4 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--accent-ink)]">
            Recruiter-ready SaaS demo
          </p>
          <h2 className="mt-6 max-w-3xl text-5xl font-semibold leading-[1.02] tracking-tight md:text-7xl">
            AI support operations that are safe, traceable, and actually built like software.
          </h2>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--muted)]">
            OpsPilot blends agentic chat, ticket automation, document retrieval, approvals,
            audit logs, and evaluation runs into one workspace. It is opinionated about safety,
            observability, and shipping with free-tier infrastructure.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href={`/w/${env.demoWorkspaceSlug}/chat`}
              className="rounded-full bg-[linear-gradient(135deg,var(--accent),#56d8ff)] px-5 py-3 text-sm font-semibold text-[var(--accent-ink)] transition hover:translate-y-[-1px]"
            >
              Explore the demo
            </Link>
            <Link
              href="/onboarding"
              className="rounded-full border border-[var(--line)] bg-[rgba(255,255,255,0.04)] px-5 py-3 text-sm font-semibold transition hover:border-[var(--accent)] hover:bg-[rgba(255,255,255,0.07)]"
            >
              Create a workspace
            </Link>
          </div>
        </div>

        <div className="rounded-[2rem] border border-[var(--line)] bg-[linear-gradient(180deg,rgba(11,18,30,0.96),rgba(6,10,18,0.92))] p-7 shadow-[var(--shadow)]">
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-[var(--muted)]">
            What it proves
          </p>
          <div className="mt-6 space-y-5">
            <div>
              <p className="text-3xl font-semibold">8</p>
              <p className="mt-1 text-sm text-[var(--muted)]">core product surfaces in one app shell</p>
            </div>
            <div>
              <p className="text-3xl font-semibold">2</p>
              <p className="mt-1 text-sm text-[var(--muted)]">model modes: local Ollama or OpenAI-compatible cloud</p>
            </div>
            <div>
              <p className="text-3xl font-semibold">100%</p>
              <p className="mt-1 text-sm text-[var(--muted)]">approval coverage for mutating AI actions</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-10 grid gap-5 md:grid-cols-3">
        {highlights.map(({ title, body, icon: Icon }) => (
          <article
            key={title}
            className="rounded-[1.75rem] border border-[var(--line)] bg-[linear-gradient(180deg,rgba(11,18,30,0.96),rgba(6,10,18,0.92))] p-6 shadow-[0_18px_54px_rgba(0,0,0,0.22)] backdrop-blur-sm"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--secondary-soft)] text-[var(--secondary)]">
              <Icon size={20} />
            </div>
            <h3 className="mt-5 text-xl font-semibold">{title}</h3>
            <p className="mt-3 text-sm leading-7 text-[var(--muted)]">{body}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
