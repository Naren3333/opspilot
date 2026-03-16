import { ArrowRight } from "lucide-react";

import { LoginForm } from "@/components/login/login-form";
import { env } from "@/lib/env";

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl items-center px-6 py-10 md:px-10">
      <div className="grid w-full gap-8 lg:grid-cols-[1.25fr_0.95fr]">
        <section className="rounded-[2rem] border border-[var(--line)] bg-[var(--card)] p-8 shadow-[var(--shadow)] md:p-10">
          <p className="font-mono text-xs uppercase tracking-[0.32em] text-[var(--muted)]">Login</p>
          <h1 className="mt-4 text-5xl font-semibold leading-tight tracking-tight md:text-6xl">
            Step into the support war room with guardrails already on.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--muted)]">
            Use Supabase magic links for the real app flow, or jump into the seeded demo workspace
            while you connect your own stack.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {[
              "Workspace-scoped provider secrets",
              "Approval gates for all mutating actions",
              "Trace and eval dashboards built into the shell",
              "Seeded documents and tickets for instant demos",
            ].map((item) => (
              <div key={item} className="rounded-[1.5rem] border border-[var(--line)] bg-white/70 p-4">
                <p className="flex items-center gap-3 text-sm font-medium">
                  <ArrowRight size={16} className="text-[var(--accent)]" />
                  {item}
                </p>
              </div>
            ))}
          </div>
        </section>

        <LoginForm demoHref={`/w/${env.demoWorkspaceSlug}/chat`} />
      </div>
    </main>
  );
}
