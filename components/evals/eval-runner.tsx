"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function EvalRunner({ workspaceSlug, caseId }: { workspaceSlug: string; caseId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function runEval() {
    setBusy(true);
    await fetch("/api/evals/run", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ workspaceSlug, caseId }),
    });
    router.refresh();
    setBusy(false);
  }

  return (
    <button
      onClick={runEval}
      disabled={busy}
      className="rounded-full border border-[var(--line)] bg-[rgba(255,255,255,0.04)] px-4 py-2 text-sm font-semibold hover:border-[var(--accent)] disabled:opacity-60"
    >
      {busy ? "Running..." : "Run eval"}
    </button>
  );
}
