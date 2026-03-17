"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [pendingApprovals, setPendingApprovals] = useState<ApprovalRequest[]>([]);
  const [error, setError] = useState<string | null>(null);

  const lastAssistantCitations = useMemo(
    () => [...messages].reverse().find((message) => message.role === "assistant")?.citations ?? [],
    [messages],
  );

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, busy]);

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
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_24rem]">
      <div className="grid h-[78vh] min-h-[42rem] grid-rows-[1fr_auto] overflow-hidden rounded-[2rem] border border-[var(--line)] bg-[linear-gradient(180deg,rgba(8,14,24,0.98),rgba(5,8,15,0.95))] shadow-[var(--shadow)]">
        <div ref={scrollRef} className="overflow-y-auto px-5 py-5 md:px-7">
          <div className="space-y-6">
            {messages.map((message) => (
              <div
                key={message.id}
                className={message.role === "user" ? "flex justify-end" : "flex justify-start"}
              >
                <div
                  className={
                    message.role === "user"
                      ? "max-w-[min(74%,44rem)] rounded-[1.8rem] border border-[rgba(133,247,217,0.24)] bg-[linear-gradient(135deg,rgba(20,36,52,0.96),rgba(12,22,34,0.92))] px-5 py-4 shadow-[0_20px_40px_rgba(0,0,0,0.26)]"
                      : "max-w-[min(88%,50rem)] rounded-[1.8rem] border border-[var(--line)] bg-[linear-gradient(180deg,rgba(12,20,32,0.96),rgba(8,14,24,0.9))] px-5 py-4 shadow-[0_20px_40px_rgba(0,0,0,0.22)]"
                  }
                >
                  <p className="whitespace-pre-wrap text-sm leading-7 text-[var(--foreground)]">
                    {message.content || "..."}
                  </p>
                  <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--muted)]">
                    {message.role} / {formatRelativeTime(message.createdAt)}
                  </p>
                  {message.citations.length > 0 ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {message.citations.map((citation) => (
                        <span
                          key={citation.id}
                          className="rounded-full border border-[rgba(133,247,217,0.18)] bg-[rgba(133,247,217,0.08)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--accent)]"
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
        </div>

        <form
          onSubmit={handleSubmit}
          className="border-t border-[var(--line)] bg-[linear-gradient(180deg,rgba(10,16,28,0.92),rgba(4,8,14,0.96))] p-5 md:p-6"
        >
          <div className="rounded-[1.6rem] border border-[var(--line)] bg-[rgba(255,255,255,0.03)] p-3">
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              rows={4}
              placeholder="Ask about support policies, draft a reply, or request a ticket action."
              className="w-full resize-none rounded-[1.2rem] bg-transparent px-2 py-2 text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--muted)]"
            />
            <div className="mt-3 flex flex-col gap-3 border-t border-[var(--line)] pt-3 md:flex-row md:items-center md:justify-between">
              <p className="text-sm text-[var(--muted)]">
                Every mutating action becomes an approval request before execution.
              </p>
              <button
                type="submit"
                disabled={busy}
                className="rounded-full bg-[linear-gradient(135deg,var(--accent),#56d8ff)] px-5 py-3 text-sm font-semibold text-[var(--accent-ink)] shadow-[0_0_24px_rgba(133,247,217,0.24)] disabled:opacity-60"
              >
                {busy ? "Streaming..." : "Run OpsPilot"}
              </button>
            </div>
          </div>
          {error ? <p className="mt-3 text-sm text-[var(--danger)]">{error}</p> : null}
        </form>
      </div>

      <div className="grid h-[78vh] min-h-[42rem] gap-6 xl:grid-rows-[1fr_1fr]">
        <div className="overflow-hidden rounded-[1.9rem] border border-[var(--line)] bg-[linear-gradient(180deg,rgba(12,18,30,0.98),rgba(7,11,20,0.92))] shadow-[0_22px_56px_rgba(0,0,0,0.26)]">
          <div className="border-b border-[var(--line)] px-5 py-4">
            <p className="font-mono text-xs uppercase tracking-[0.32em] text-[var(--accent)]/80">Latest evidence</p>
          </div>
          <div className="max-h-[calc(78vh-5rem)] space-y-3 overflow-y-auto px-5 py-4">
            {lastAssistantCitations.length ? (
              lastAssistantCitations.map((citation) => (
                <div
                  key={citation.id}
                  className="rounded-[1.35rem] border border-[var(--line)] bg-[rgba(255,255,255,0.03)] p-4"
                >
                  <p className="text-sm font-semibold text-[var(--foreground)]">{citation.label}</p>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{citation.excerpt}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-[var(--muted)]">Citations from the next answer will appear here.</p>
            )}
          </div>
        </div>

        <div className="overflow-hidden rounded-[1.9rem] border border-[var(--line)] bg-[linear-gradient(180deg,rgba(12,18,30,0.98),rgba(7,11,20,0.92))] shadow-[0_22px_56px_rgba(0,0,0,0.26)]">
          <div className="border-b border-[var(--line)] px-5 py-4">
            <p className="font-mono text-xs uppercase tracking-[0.32em] text-[var(--secondary)]/80">Fresh approvals</p>
          </div>
          <div className="max-h-[calc(78vh-5rem)] space-y-3 overflow-y-auto px-5 py-4">
            {pendingApprovals.length ? (
              pendingApprovals.map((approval) => (
                <div
                  key={approval.id}
                  className="rounded-[1.35rem] border border-[rgba(255,134,88,0.18)] bg-[rgba(255,134,88,0.06)] p-4"
                >
                  <p className="text-sm font-semibold text-[var(--foreground)]">{approval.title}</p>
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
