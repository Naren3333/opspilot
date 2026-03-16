"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import type { ApprovalRequest, Citation, MessageRecord } from "@/lib/types";
import { formatRelativeTime } from "@/lib/utils";

interface ChatClientProps {
  workspaceSlug: string;
  conversationId: string;
  initialMessages: MessageRecord[];
}

function parseJsonLines(input: string) {
  return input
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as {
      type: "chunk" | "meta" | "error" | "done";
      content?: string;
      citations?: Citation[];
      approvals?: ApprovalRequest[];
      error?: string;
    });
}

export function ChatClient({ workspaceSlug, conversationId, initialMessages }: ChatClientProps) {
  const router = useRouter();
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [pendingApprovals, setPendingApprovals] = useState<ApprovalRequest[]>([]);
  const [error, setError] = useState<string | null>(null);

  const lastAssistantCitations = useMemo(
    () => [...messages].reverse().find((message) => message.role === "assistant")?.citations ?? [],
    [messages],
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!input.trim()) return;

    const userText = input.trim();
    setBusy(true);
    setError(null);
    setInput("");

    const optimisticUser: MessageRecord = {
      id: `temp_user_${Date.now()}`,
      conversationId,
      workspaceId: workspaceSlug,
      role: "user",
      content: userText,
      citations: [],
      createdAt: new Date().toISOString(),
    };

    const optimisticAssistant: MessageRecord = {
      id: `temp_assistant_${Date.now()}`,
      conversationId,
      workspaceId: workspaceSlug,
      role: "assistant",
      content: "",
      citations: [],
      createdAt: new Date().toISOString(),
    };

    setMessages((current) => [...current, optimisticUser, optimisticAssistant]);

    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        workspaceSlug,
        conversationId,
        message: userText,
      }),
    });

    if (!response.ok || !response.body) {
      setBusy(false);
      setError("The chat route failed to stream a response.");
      router.refresh();
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done });

      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const rawLine of lines) {
        if (!rawLine.trim()) continue;
        const [entry] = parseJsonLines(rawLine);

        if (entry.type === "chunk" && entry.content) {
          setMessages((current) =>
            current.map((message, index) =>
              index === current.length - 1 && message.role === "assistant"
                ? { ...message, content: `${message.content}${entry.content}` }
                : message,
            ),
          );
        }

        if (entry.type === "meta") {
          setMessages((current) =>
            current.map((message, index) =>
              index === current.length - 1 && message.role === "assistant"
                ? { ...message, citations: entry.citations ?? [] }
                : message,
            ),
          );
          setPendingApprovals(entry.approvals ?? []);
        }

        if (entry.type === "error") {
          setError(entry.error ?? "Unknown chat error.");
        }
      }

      if (done) {
        break;
      }
    }

    setBusy(false);
    router.refresh();
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.7fr_0.9fr]">
      <div className="rounded-[1.75rem] border border-[var(--line)] bg-white/75 p-5 shadow-[var(--shadow)]">
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={message.role === "user" ? "flex justify-end" : "flex justify-start"}
            >
              <div
                className={
                  message.role === "user"
                    ? "max-w-3xl rounded-[1.5rem] bg-[var(--foreground)] px-5 py-4 text-white"
                    : "max-w-3xl rounded-[1.5rem] border border-[var(--line)] bg-[var(--card-strong)] px-5 py-4"
                }
              >
                <p className="whitespace-pre-wrap text-sm leading-7">{message.content || "..."}</p>
                <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.22em] opacity-65">
                  {message.role} · {formatRelativeTime(message.createdAt)}
                </p>
                {message.citations.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {message.citations.map((citation) => (
                      <span
                        key={citation.id}
                        className="rounded-full bg-[rgba(28,107,103,0.12)] px-3 py-1 text-xs font-semibold text-[var(--secondary)]"
                      >
                        {citation.label}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-3">
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            rows={4}
            placeholder="Ask about support policies, draft a reply, or request a ticket action."
            className="w-full rounded-[1.5rem] border border-[var(--line)] bg-[var(--background)] px-4 py-4 outline-none transition focus:border-[var(--accent)]"
          />
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-[var(--muted)]">
              Every mutating action becomes an approval request before execution.
            </p>
            <button
              type="submit"
              disabled={busy}
              className="rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
            >
              {busy ? "Streaming..." : "Run OpsPilot"}
            </button>
          </div>
          {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
        </form>
      </div>

      <div className="space-y-6">
        <div className="rounded-[1.75rem] border border-[var(--line)] bg-white/75 p-5 shadow-[0_16px_42px_rgba(45,41,36,0.08)]">
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-[var(--muted)]">Latest evidence</p>
          <div className="mt-4 space-y-3">
            {lastAssistantCitations.length ? (
              lastAssistantCitations.map((citation) => (
                <div key={citation.id} className="rounded-2xl border border-[var(--line)] bg-[var(--card)] p-4">
                  <p className="text-sm font-semibold">{citation.label}</p>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{citation.excerpt}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-[var(--muted)]">Citations from the next answer will appear here.</p>
            )}
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-[var(--line)] bg-white/75 p-5 shadow-[0_16px_42px_rgba(45,41,36,0.08)]">
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-[var(--muted)]">Fresh approvals</p>
          <div className="mt-4 space-y-3">
            {pendingApprovals.length ? (
              pendingApprovals.map((approval) => (
                <div key={approval.id} className="rounded-2xl border border-[var(--line)] bg-[var(--card)] p-4">
                  <p className="text-sm font-semibold">{approval.title}</p>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{approval.summary}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-[var(--muted)]">No new approval requests from this session yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
