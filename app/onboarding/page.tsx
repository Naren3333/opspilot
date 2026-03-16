import { createWorkspaceAction } from "@/app/onboarding/actions";

export default function OnboardingPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl items-center px-6 py-10">
      <section className="w-full rounded-[2rem] border border-[var(--line)] bg-[var(--card)] p-8 shadow-[var(--shadow)] md:p-10">
        <p className="font-mono text-xs uppercase tracking-[0.32em] text-[var(--muted)]">Onboarding</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">
          Create a support workspace in one pass.
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--muted)]">
          This seeds the app shell, role model, and dashboard routes so you can plug in providers and
          documents immediately after setup.
        </p>

        <form action={createWorkspaceAction} className="mt-8 grid gap-5 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium">Workspace name</label>
            <input
              name="name"
              required
              placeholder="Northstar Support"
              className="mt-2 w-full rounded-[1.5rem] border border-[var(--line)] bg-white/80 px-4 py-3"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Industry</label>
            <input
              name="industry"
              required
              placeholder="B2B SaaS"
              className="mt-2 w-full rounded-[1.5rem] border border-[var(--line)] bg-white/80 px-4 py-3"
            />
          </div>
          <div className="md:col-span-2">
            <button
              type="submit"
              className="rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white"
            >
              Create workspace
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
