"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ApprovalActions({ approvalId }: { approvalId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);

  async function handleDecision(decision: "approve" | "reject") {
    setBusy(decision);
    await fetch(`/api/approvals/${approvalId}/${decision}`, {
      method: "POST",
    });
    router.refresh();
    setBusy(null);
  }

  return (
    <div className="flex gap-3">
      <button
        onClick={() => handleDecision("approve")}
        disabled={busy !== null}
        className="rounded-full bg-[linear-gradient(135deg,var(--accent),#56d8ff)] px-4 py-2 text-sm font-semibold text-[var(--accent-ink)] disabled:opacity-60"
      >
        {busy === "approve" ? "Approving..." : "Approve"}
      </button>
      <button
        onClick={() => handleDecision("reject")}
        disabled={busy !== null}
        className="rounded-full border border-[rgba(255,109,133,0.24)] bg-[rgba(255,109,133,0.08)] px-4 py-2 text-sm font-semibold text-[var(--danger)] disabled:opacity-60"
      >
        {busy === "reject" ? "Rejecting..." : "Reject"}
      </button>
    </div>
  );
}
