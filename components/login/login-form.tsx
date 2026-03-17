"use client";

import { useState } from "react";
import Link from "next/link";
import { Github, Mail } from "lucide-react";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type OAuthProvider = "github" | "google";

export function LoginForm({
  demoHref,
  initialMessage,
}: {
  demoHref: string;
  initialMessage?: string;
}) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<string | null>(initialMessage ?? null);
  const [pendingAction, setPendingAction] = useState<"magic-link" | OAuthProvider | null>(null);

  async function ensureClient() {
    const client = createSupabaseBrowserClient();
    if (!client) {
      setStatus("Supabase is not configured yet, so demo mode is active.");
      return null;
    }

    return client;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const client = await ensureClient();
    if (!client) return;

    setPendingAction("magic-link");
    setStatus(null);

    const { error } = await client.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/onboarding`,
      },
    });

    setPendingAction(null);
    setStatus(error ? error.message : "Magic link sent. Check your inbox.");
  }

  async function handleOAuthSignIn(provider: OAuthProvider) {
    const client = await ensureClient();
    if (!client) return;

    setPendingAction(provider);
    setStatus(null);

    const { error } = await client.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/onboarding`,
      },
    });

    setPendingAction(null);
    if (error) {
      setStatus(error.message);
    }
  }

  return (
    <div className="rounded-[1.75rem] border border-[var(--line)] bg-[linear-gradient(180deg,rgba(11,18,30,0.96),rgba(6,10,18,0.92))] p-6 shadow-[var(--shadow)]">
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => handleOAuthSignIn("github")}
          disabled={pendingAction !== null}
          className="flex w-full items-center justify-center gap-3 rounded-2xl border border-[var(--line)] bg-[rgba(255,255,255,0.04)] px-4 py-3 text-sm font-semibold transition hover:border-[var(--accent)] hover:bg-[rgba(255,255,255,0.07)] disabled:opacity-70"
        >
          <Github size={17} />
          {pendingAction === "github" ? "Redirecting to GitHub..." : "Continue with GitHub"}
        </button>

        <button
          type="button"
          onClick={() => handleOAuthSignIn("google")}
          disabled={pendingAction !== null}
          className="flex w-full items-center justify-center gap-3 rounded-2xl border border-[var(--line)] bg-[rgba(255,255,255,0.04)] px-4 py-3 text-sm font-semibold transition hover:border-[var(--accent)] hover:bg-[rgba(255,255,255,0.07)] disabled:opacity-70"
        >
          <span className="flex h-[17px] w-[17px] items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--secondary),#ffd17c)] text-[10px] font-bold text-[var(--accent-ink)]">
            G
          </span>
          {pendingAction === "google" ? "Redirecting to Google..." : "Continue with Google"}
        </button>
      </div>

      <div className="my-5 flex items-center gap-3">
        <div className="h-px flex-1 bg-[var(--line)]" />
        <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--muted)]">or use email</p>
        <div className="h-px flex-1 bg-[var(--line)]" />
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="text-sm font-medium">Work email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-2 w-full rounded-2xl border border-[var(--line)] bg-[rgba(255,255,255,0.04)] px-4 py-3 outline-none transition focus:border-[var(--accent)]"
            placeholder="you@company.com"
          />
        </div>

        <button
          type="submit"
          disabled={pendingAction !== null}
          className="w-full rounded-2xl bg-[linear-gradient(135deg,var(--accent),#56d8ff)] px-4 py-3 text-sm font-semibold text-[var(--accent-ink)] transition hover:shadow-[0_0_24px_rgba(133,247,217,0.24)] disabled:opacity-70"
        >
          <span className="flex items-center justify-center gap-2">
            <Mail size={16} />
            {pendingAction === "magic-link" ? "Sending magic link..." : "Send magic link"}
          </span>
        </button>
      </form>

      {status ? <p className="mt-4 text-sm text-[var(--muted)]">{status}</p> : null}

      <div className="mt-6 rounded-2xl border border-dashed border-[var(--line)] bg-[rgba(255,255,255,0.03)] p-4">
        <p className="text-sm font-medium">No Supabase keys yet?</p>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
          You can still explore the seeded workspace while wiring up auth and storage.
        </p>
        <Link
          href={demoHref}
          className="mt-4 inline-flex rounded-full bg-[linear-gradient(135deg,var(--secondary),#ffb36f)] px-4 py-2 text-sm font-semibold text-[var(--accent-ink)]"
        >
          Open demo workspace
        </Link>
      </div>
    </div>
  );
}
