"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function DocumentUploadForm({ workspaceSlug }: { workspaceSlug: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const file = data.get("file");
    if (!(file instanceof File)) {
      setStatus("Choose a file first.");
      return;
    }

    setBusy(true);
    setStatus("Uploading document...");
    data.append("workspaceSlug", workspaceSlug);

    const uploadResponse = await fetch("/api/documents/upload", {
      method: "POST",
      body: data,
    });

    if (!uploadResponse.ok) {
      const payload = await uploadResponse.json().catch(() => null);
      setStatus(payload?.error ?? "Upload failed.");
      setBusy(false);
      return;
    }

    setStatus("Queued document. Processing index...");
    await fetch("/api/worker/drain", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ workspaceSlug }),
    });

    form.reset();
    router.refresh();
    setStatus("Document indexed.");
    setBusy(false);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-[1.5rem] border border-dashed border-[var(--line)] bg-[rgba(255,255,255,0.02)] p-5"
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <input
          name="file"
          type="file"
          accept=".pdf,.md,.txt"
          className="w-full rounded-2xl border border-[var(--line)] bg-[rgba(255,255,255,0.04)] px-4 py-3"
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded-full bg-[linear-gradient(135deg,var(--accent),#56d8ff)] px-5 py-3 text-sm font-semibold text-[var(--accent-ink)] disabled:opacity-60"
        >
          {busy ? "Working..." : "Upload and index"}
        </button>
      </div>
      {status ? <p className="mt-3 text-sm text-[var(--muted)]">{status}</p> : null}
    </form>
  );
}
