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
        className="rounded-full bg-[var(--success)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
      >
        {busy === "approve" ? "Approving..." : "Approve"}
      </button>
      <button
        onClick={() => handleDecision("reject")}
        disabled={busy !== null}
        className="rounded-full border border-[var(--line)] px-4 py-2 text-sm font-semibold disabled:opacity-60"
      >
        {busy === "reject" ? "Rejecting..." : "Reject"}
      </button>
    </div>
  );
}
