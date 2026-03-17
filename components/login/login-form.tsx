"use client";

import { useState } from "react";
import Link from "next/link";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function LoginForm({ demoHref }: { demoHref: string }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const client = createSupabaseBrowserClient();
    if (!client) {
      setStatus("Supabase is not configured yet, so demo mode is active.");
      return;
    }

    setSubmitting(true);
    setStatus(null);

    const { error } = await client.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    setSubmitting(false);
    setStatus(error ? error.message : "Magic link sent. Check your inbox.");
  }

  return (
    <div className="rounded-[1.75rem] border border-[var(--line)] bg-[linear-gradient(180deg,rgba(11,18,30,0.96),rgba(6,10,18,0.92))] p-6 shadow-[var(--shadow)]">
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
          disabled={submitting}
          className="w-full rounded-2xl bg-[linear-gradient(135deg,var(--accent),#56d8ff)] px-4 py-3 text-sm font-semibold text-[var(--accent-ink)] transition hover:shadow-[0_0_24px_rgba(133,247,217,0.24)] disabled:opacity-70"
        >
          {submitting ? "Sending magic link..." : "Send magic link"}
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
