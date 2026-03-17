"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bot,
  FileCode2,
  FileSearch,
  History,
  LoaderCircle,
  MessageSquarePlus,
  Play,
  ShieldAlert,
  Upload,
} from "lucide-react";

import type { ApprovalRequest, Citation, Conversation, DocumentRecord, MessageRecord } from "@/lib/types";
import { cn, formatRelativeTime } from "@/lib/utils";

interface ChatClientProps {
  workspaceSlug: string;
  initialConversationId: string | null;
  initialConversationTitle: string | null;
  initialConversations: Conversation[];
  initialDocuments: DocumentRecord[];
  initialMessages: MessageRecord[];
  pendingApprovalCount: number;
}

const FILE_ACCEPT =
  ".c,.cpp,.css,.go,.html,.java,.js,.json,.jsx,.kt,.md,.mjs,.pdf,.php,.py,.rb,.rs,.sh,.sql,.swift,.ts,.tsx,.txt,.yaml,.yml";

function parseJsonLine(line: string) {
  return JSON.parse(line) as {
    type: "chunk" | "meta" | "error" | "done";
    content?: string;
    conversationId?: string;
    conversationTitle?: string;
    citations?: Citation[];
    approvals?: ApprovalRequest[];
    error?: string;
  };
}

function isCodeLikeDocument(document: DocumentRecord) {
  const fileName = document.sourcePath ?? document.title;
  return /\.(c|cpp|css|go|html|java|js|json|jsx|kt|md|mjs|php|py|rb|rs|sh|sql|swift|ts|tsx|txt|yaml|yml)$/i.test(
    fileName,
  );
}

function pickDefaultDocumentIds(documents: DocumentRecord[]) {
  const candidates = documents.filter((document) => document.status === "indexed");
  const codeFirst = candidates.filter(isCodeLikeDocument);
  const selection = (codeFirst.length ? codeFirst : candidates).slice(0, 3);
  return selection.map((document) => document.id);
}

function formatThreadTitle(title: string | null) {
  if (!title) {
    return "New review thread";
  }

  return title;
}

function buildReviewPrompt(selectedDocuments: DocumentRecord[]) {
  if (!selectedDocuments.length) {
    return "Review the current thread like a senior engineer. Call out bugs, regressions, security risks, and missing tests first.";
  }

  const names = selectedDocuments
    .slice(0, 3)
    .map((document) => document.sourcePath ?? document.title)
    .join(", ");

  return `Review the selected files (${names}) like a senior engineer. Call out bugs, regressions, security risks, and missing tests first.`;
}

export function ChatClient({
  workspaceSlug,
  initialConversationId,
  initialConversationTitle,
  initialConversations,
  initialDocuments,
  initialMessages,
  pendingApprovalCount,
}: ChatClientProps) {
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingApprovals, setPendingApprovals] = useState<ApprovalRequest[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(initialConversationId);
  const [conversationTitle, setConversationTitle] = useState<string | null>(initialConversationTitle);
  const [conversations, setConversations] = useState(initialConversations);
  const [documents, setDocuments] = useState(initialDocuments);
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>(() =>
    pickDefaultDocumentIds(initialDocuments),
  );

  useEffect(() => {
    setMessages(initialMessages);
    setConversationId(initialConversationId);
    setConversationTitle(initialConversationTitle);
  }, [initialConversationId, initialConversationTitle, initialMessages]);

  useEffect(() => {
    setConversations(initialConversations);
  }, [initialConversations]);

  useEffect(() => {
    setDocuments(initialDocuments);
    setSelectedDocumentIds((current) => {
      const currentIds = new Set(initialDocuments.map((document) => document.id));
      const filtered = current.filter((id) => currentIds.has(id));
      return filtered.length ? filtered : pickDefaultDocumentIds(initialDocuments);
    });
  }, [initialDocuments]);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, busy]);

  const selectedDocuments = useMemo(
    () => documents.filter((document) => selectedDocumentIds.includes(document.id)),
    [documents, selectedDocumentIds],
  );

  const lastAssistantCitations = useMemo(
    () => [...messages].reverse().find((message) => message.role === "assistant")?.citations ?? [],
    [messages],
  );

  function syncConversationList(nextConversationId: string, nextTitle: string, updatedAt: string) {
    setConversations((current) => {
      const existing = current.find((conversation) => conversation.id === nextConversationId);
      const nextConversation: Conversation = existing
        ? { ...existing, title: nextTitle, updatedAt }
        : {
            id: nextConversationId,
            workspaceId: workspaceSlug,
            title: nextTitle,
            createdAt: updatedAt,
            updatedAt,
          };

      return [
        nextConversation,
        ...current.filter((conversation) => conversation.id !== nextConversationId),
      ];
    });
  }

  async function streamMessage(messageOverride?: string) {
    const userText = (messageOverride ?? input).trim();
    if (!userText || busy) return;

    const startedAt = new Date().toISOString();
    setBusy(true);
    setError(null);
    setInput("");

    const optimisticUser: MessageRecord = {
      id: `temp_user_${Date.now()}`,
      conversationId: conversationId ?? "draft",
      workspaceId: workspaceSlug,
      role: "user",
      content: userText,
      citations: [],
      createdAt: startedAt,
    };

    const optimisticAssistant: MessageRecord = {
      id: `temp_assistant_${Date.now()}`,
      conversationId: conversationId ?? "draft",
      workspaceId: workspaceSlug,
      role: "assistant",
      content: "",
      citations: [],
      createdAt: startedAt,
    };

    setMessages((current) => [...current, optimisticUser, optimisticAssistant]);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          workspaceSlug,
          conversationId: conversationId ?? undefined,
          message: userText,
          documentIds: selectedDocumentIds,
        }),
      });

      if (!response.ok || !response.body) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? "The review route failed to stream a response.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let nextConversationId = conversationId;
      let nextConversationTitle = conversationTitle ?? "New review thread";

      while (true) {
        const { done, value } = await reader.read();
        buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done });

        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const rawLine of lines) {
          if (!rawLine.trim()) continue;
          const entry = parseJsonLine(rawLine);

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
            if (entry.conversationId) {
              nextConversationId = entry.conversationId;
              setConversationId(entry.conversationId);
            }

            if (entry.conversationTitle) {
              nextConversationTitle = entry.conversationTitle;
              setConversationTitle(entry.conversationTitle);
            }

            setMessages((current) =>
              current.map((message, index) =>
                index === current.length - 1 && message.role === "assistant"
                  ? { ...message, conversationId: nextConversationId ?? message.conversationId, citations: entry.citations ?? [] }
                  : message.role === "user" && index === current.length - 2
                    ? { ...message, conversationId: nextConversationId ?? message.conversationId }
                    : message,
              ),
            );

            setPendingApprovals(entry.approvals ?? []);

            if (nextConversationId) {
              syncConversationList(nextConversationId, nextConversationTitle, new Date().toISOString());
              if (!conversationId) {
                router.replace(`/w/${workspaceSlug}/chat?conversation=${nextConversationId}`);
              }
            }
          }

          if (entry.type === "error") {
            setError(entry.error ?? "Unknown review error.");
          }
        }

        if (done) {
          break;
        }
      }
    } catch (streamError) {
      setError(streamError instanceof Error ? streamError.message : "The review request failed.");
      setMessages((current) => current.slice(0, -1));
    } finally {
      setBusy(false);
    }
  }

  async function handleUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fileInput = form.elements.namedItem("files");
    if (!(fileInput instanceof HTMLInputElement) || !fileInput.files?.length) {
      setUploadStatus("Choose one or more files first.");
      return;
    }

    setUploadBusy(true);
    setUploadStatus("Uploading files into the review workspace...");
    setError(null);

    try {
      const uploadedDocuments: DocumentRecord[] = [];

      for (const file of Array.from(fileInput.files)) {
        const formData = new FormData();
        formData.append("workspaceSlug", workspaceSlug);
        formData.append("file", file);

        const response = await fetch("/api/documents/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          throw new Error(payload?.error ?? `Failed to upload ${file.name}.`);
        }

        const payload = (await response.json()) as {
          document: DocumentRecord;
        };
        uploadedDocuments.push(payload.document);
      }

      await fetch("/api/worker/drain", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ workspaceSlug }),
      });

      const indexedAt = new Date().toISOString();
      const normalizedUploads = uploadedDocuments.map((document) => ({
        ...document,
        status: "indexed" as const,
        updatedAt: indexedAt,
      }));

      setDocuments((current) => {
        const merged = [...normalizedUploads, ...current.filter((document) => !normalizedUploads.some((item) => item.id === document.id))];
        return merged.sort((left, right) => (left.updatedAt < right.updatedAt ? 1 : -1));
      });
      setSelectedDocumentIds((current) => [
        ...new Set([...normalizedUploads.map((document) => document.id), ...current]),
      ]);
      setUploadStatus(`Indexed ${normalizedUploads.length} file${normalizedUploads.length === 1 ? "" : "s"} for review.`);
      form.reset();
    } catch (uploadError) {
      setUploadStatus(uploadError instanceof Error ? uploadError.message : "Upload failed.");
    } finally {
      setUploadBusy(false);
    }
  }

  function toggleDocument(documentId: string) {
    setSelectedDocumentIds((current) =>
      current.includes(documentId) ? current.filter((id) => id !== documentId) : [documentId, ...current],
    );
  }

  function handleNewThread() {
    setConversationId(null);
    setConversationTitle(null);
    setMessages([]);
    setPendingApprovals([]);
    setError(null);
    setInput("");
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[17rem_minmax(0,1fr)_22rem]">
      <aside className="grid gap-4">
        <section className="rounded-[1.8rem] border border-[var(--line)] bg-[linear-gradient(180deg,rgba(11,15,23,0.98),rgba(7,10,17,0.96))] p-4 shadow-[var(--shadow)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-[var(--muted)]">
                Review threads
              </p>
              <p className="mt-2 text-sm text-[var(--muted)]">Keep each file pass in its own history.</p>
            </div>
            <button
              type="button"
              onClick={handleNewThread}
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--line)] bg-[rgba(255,255,255,0.04)] text-[var(--foreground)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
            >
              <MessageSquarePlus size={18} />
            </button>
          </div>

          <div className="mt-4 space-y-2">
            <button
              type="button"
              onClick={handleNewThread}
              className={cn(
                "w-full rounded-[1.3rem] border px-3 py-3 text-left transition",
                conversationId === null
                  ? "border-[rgba(129,180,255,0.28)] bg-[rgba(129,180,255,0.12)]"
                  : "border-transparent bg-[rgba(255,255,255,0.03)] hover:border-[var(--line)]",
              )}
            >
              <p className="flex items-center gap-2 text-sm font-medium">
                <History size={15} className="text-[var(--accent)]" />
                New review thread
              </p>
              <p className="mt-2 text-xs text-[var(--muted)]">Start fresh and upload a new file set.</p>
            </button>

            {conversations.map((conversation) => (
              <button
                key={conversation.id}
                type="button"
                onClick={() => router.push(`/w/${workspaceSlug}/chat?conversation=${conversation.id}`)}
                className={cn(
                  "w-full rounded-[1.3rem] border px-3 py-3 text-left transition",
                  conversation.id === conversationId
                    ? "border-[rgba(133,247,217,0.24)] bg-[rgba(133,247,217,0.1)]"
                    : "border-transparent bg-[rgba(255,255,255,0.03)] hover:border-[var(--line)]",
                )}
              >
                <p className="truncate text-sm font-medium text-[var(--foreground)]">{conversation.title}</p>
                <p className="mt-2 text-xs text-[var(--muted)]">{formatRelativeTime(conversation.updatedAt)}</p>
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-[1.8rem] border border-[var(--line)] bg-[linear-gradient(180deg,rgba(11,15,23,0.98),rgba(7,10,17,0.96))] p-4 shadow-[var(--shadow)]">
          <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-[var(--muted)]">Quick runs</p>
          <div className="mt-4 space-y-2">
            {[
              "Review the selected files like a senior engineer. Call out bugs, regressions, security risks, and missing tests first.",
              "Summarize the architecture and the most fragile parts of the selected files.",
              "List the tests I should write before merging these files.",
            ].map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => setInput(prompt)}
                className="w-full rounded-[1.2rem] border border-transparent bg-[rgba(255,255,255,0.03)] px-3 py-3 text-left text-sm text-[var(--muted)] transition hover:border-[var(--line)] hover:text-[var(--foreground)]"
              >
                {prompt}
              </button>
            ))}
          </div>
        </section>
      </aside>

      <section className="grid h-[82vh] min-h-[44rem] grid-rows-[auto_1fr_auto] overflow-hidden rounded-[1.9rem] border border-[var(--line)] bg-[linear-gradient(180deg,rgba(10,13,21,0.99),rgba(5,8,13,0.96))] shadow-[0_30px_80px_rgba(0,0,0,0.42)]">
        <div className="border-b border-[var(--line)] px-5 py-4 md:px-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-[var(--muted)]">
                {conversationId ? "Active thread" : "Draft thread"}
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                {formatThreadTitle(conversationTitle)}
              </h2>
              <p className="mt-2 text-sm text-[var(--muted)]">
                Submit files, keep the context pinned, and let the agent review like a teammate.
              </p>
            </div>

            <div className="grid gap-2 sm:grid-cols-3">
              <div className="rounded-[1.2rem] border border-[var(--line)] bg-[rgba(255,255,255,0.03)] px-4 py-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--muted)]">Pinned files</p>
                <p className="mt-2 text-lg font-semibold">{selectedDocuments.length}</p>
              </div>
              <div className="rounded-[1.2rem] border border-[var(--line)] bg-[rgba(255,255,255,0.03)] px-4 py-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--muted)]">History</p>
                <p className="mt-2 text-lg font-semibold">{messages.length}</p>
              </div>
              <div className="rounded-[1.2rem] border border-[var(--line)] bg-[rgba(255,255,255,0.03)] px-4 py-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--muted)]">Approvals</p>
                <p className="mt-2 text-lg font-semibold">{pendingApprovalCount + pendingApprovals.length}</p>
              </div>
            </div>
          </div>
        </div>

        <div ref={scrollRef} className="overflow-y-auto px-5 py-5 md:px-6">
          <div className="space-y-5">
            {messages.length === 0 ? (
              <div className="rounded-[1.6rem] border border-dashed border-[var(--line)] bg-[rgba(255,255,255,0.02)] p-6">
                <p className="text-lg font-medium text-[var(--foreground)]">No messages yet.</p>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--muted)]">
                  Upload one or more files from the right rail, then click &quot;Run review&quot; or ask for a bug scan, PR pass, or test plan.
                </p>
              </div>
            ) : null}

            {messages.map((message) => (
              <div
                key={message.id}
                className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "max-w-[min(90%,54rem)] rounded-[1.6rem] border px-5 py-4 shadow-[0_18px_44px_rgba(0,0,0,0.26)]",
                    message.role === "user"
                      ? "border-[rgba(129,180,255,0.22)] bg-[linear-gradient(180deg,rgba(20,29,43,0.98),rgba(11,18,30,0.94))]"
                      : "border-[var(--line)] bg-[linear-gradient(180deg,rgba(13,17,26,0.98),rgba(8,11,18,0.96))]",
                  )}
                >
                  <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-[var(--muted)]">
                    {message.role === "assistant" ? <Bot size={14} /> : <FileSearch size={14} />}
                    <span>{message.role}</span>
                    <span>-</span>
                    <span>{formatRelativeTime(message.createdAt)}</span>
                  </div>

                  <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-[var(--foreground)]">
                    {message.content || "..."}
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

        <div className="border-t border-[var(--line)] bg-[linear-gradient(180deg,rgba(11,14,21,0.98),rgba(6,8,14,0.98))] p-5 md:p-6">
          {selectedDocuments.length ? (
            <div className="mb-3 flex flex-wrap gap-2">
              {selectedDocuments.map((document) => (
                <button
                  key={document.id}
                  type="button"
                  onClick={() => toggleDocument(document.id)}
                  className="rounded-full border border-[rgba(129,180,255,0.22)] bg-[rgba(129,180,255,0.1)] px-3 py-1.5 text-xs font-semibold text-[var(--foreground)]"
                >
                  {document.sourcePath ?? document.title}
                </button>
              ))}
            </div>
          ) : null}

          <form
            onSubmit={(event) => {
              event.preventDefault();
              void streamMessage();
            }}
            className="rounded-[1.5rem] border border-[var(--line)] bg-[rgba(255,255,255,0.03)] p-3"
          >
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              rows={4}
              placeholder="Ask for a PR review, bug scan, architecture critique, or missing-test pass."
              className="w-full resize-none rounded-[1.2rem] bg-transparent px-2 py-2 text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--muted)]"
            />

            <div className="mt-3 flex flex-col gap-3 border-t border-[var(--line)] pt-3 md:flex-row md:items-center md:justify-between">
              <p className="text-sm text-[var(--muted)]">
                Selected context: {selectedDocuments.length ? `${selectedDocuments.length} file(s)` : "no files pinned yet"}
              </p>

              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => void streamMessage(buildReviewPrompt(selectedDocuments))}
                  disabled={busy}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--line)] bg-[rgba(255,255,255,0.04)] px-4 py-3 text-sm font-semibold text-[var(--foreground)] transition hover:border-[var(--accent)] disabled:opacity-60"
                >
                  <Play size={16} />
                  Run review
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#b8d4ff,#7af5df)] px-5 py-3 text-sm font-semibold text-[#07131f] transition hover:shadow-[0_0_24px_rgba(122,245,223,0.2)] disabled:opacity-60"
                >
                  {busy ? <LoaderCircle size={16} className="animate-spin" /> : <Bot size={16} />}
                  {busy ? "Reviewing..." : "Send to agent"}
                </button>
              </div>
            </div>
          </form>

          {error ? <p className="mt-3 text-sm text-[var(--danger)]">{error}</p> : null}
        </div>
      </section>

      <aside className="grid h-[82vh] min-h-[44rem] gap-4 xl:grid-rows-[auto_1fr_1fr]">
        <section className="rounded-[1.8rem] border border-[var(--line)] bg-[linear-gradient(180deg,rgba(11,15,23,0.98),rgba(7,10,17,0.96))] p-4 shadow-[var(--shadow)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-[var(--muted)]">Submit files</p>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                Drop code, config, or docs here and pin them into the current review.
              </p>
            </div>
            <Upload size={18} className="text-[var(--accent)]" />
          </div>

          <form onSubmit={handleUpload} className="mt-4 space-y-3">
            <input
              name="files"
              type="file"
              multiple
              accept={FILE_ACCEPT}
              className="w-full rounded-[1.2rem] border border-dashed border-[var(--line)] bg-[rgba(255,255,255,0.03)] px-4 py-4 text-sm text-[var(--muted)]"
            />
            <button
              type="submit"
              disabled={uploadBusy}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-[var(--line)] bg-[rgba(255,255,255,0.04)] px-4 py-3 text-sm font-semibold text-[var(--foreground)] transition hover:border-[var(--accent)] disabled:opacity-60"
            >
              {uploadBusy ? <LoaderCircle size={16} className="animate-spin" /> : <Upload size={16} />}
              {uploadBusy ? "Indexing files..." : "Upload to review workspace"}
            </button>
          </form>

          {uploadStatus ? <p className="mt-3 text-sm text-[var(--muted)]">{uploadStatus}</p> : null}
        </section>

        <section className="overflow-hidden rounded-[1.8rem] border border-[var(--line)] bg-[linear-gradient(180deg,rgba(11,15,23,0.98),rgba(7,10,17,0.96))] shadow-[var(--shadow)]">
          <div className="border-b border-[var(--line)] px-4 py-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-[var(--muted)]">Pinned context</p>
          </div>
          <div className="max-h-[calc(41vh-6rem)] space-y-3 overflow-y-auto px-4 py-4">
            {documents.length ? (
              documents.map((document) => {
                const selected = selectedDocumentIds.includes(document.id);
                return (
                  <button
                    key={document.id}
                    type="button"
                    onClick={() => toggleDocument(document.id)}
                    className={cn(
                      "w-full rounded-[1.25rem] border px-4 py-3 text-left transition",
                      selected
                        ? "border-[rgba(129,180,255,0.28)] bg-[rgba(129,180,255,0.1)]"
                        : "border-[var(--line)] bg-[rgba(255,255,255,0.03)] hover:border-[rgba(129,180,255,0.18)]",
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="truncate text-sm font-medium text-[var(--foreground)]">
                        {document.sourcePath ?? document.title}
                      </p>
                      <FileCode2 size={15} className={selected ? "text-[var(--accent)]" : "text-[var(--muted)]"} />
                    </div>
                    <p className="mt-2 text-xs leading-5 text-[var(--muted)]">{document.summary}</p>
                    <p className="mt-2 text-[11px] uppercase tracking-[0.2em] text-[var(--muted)]">
                      {document.status} • {formatRelativeTime(document.updatedAt)}
                    </p>
                  </button>
                );
              })
            ) : (
              <p className="px-1 text-sm text-[var(--muted)]">Uploaded files will appear here once indexed.</p>
            )}
          </div>
        </section>

        <section className="overflow-hidden rounded-[1.8rem] border border-[var(--line)] bg-[linear-gradient(180deg,rgba(11,15,23,0.98),rgba(7,10,17,0.96))] shadow-[var(--shadow)]">
          <div className="border-b border-[var(--line)] px-4 py-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-[var(--muted)]">Latest evidence</p>
          </div>
          <div className="max-h-[calc(41vh-6rem)] space-y-3 overflow-y-auto px-4 py-4">
            {lastAssistantCitations.length ? (
              lastAssistantCitations.map((citation) => (
                <div
                  key={citation.id}
                  className="rounded-[1.25rem] border border-[var(--line)] bg-[rgba(255,255,255,0.03)] p-4"
                >
                  <p className="text-sm font-semibold text-[var(--foreground)]">{citation.label}</p>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{citation.excerpt}</p>
                </div>
              ))
            ) : (
              <p className="px-1 text-sm text-[var(--muted)]">
                Evidence snippets from the next assistant review will show up here.
              </p>
            )}

            {pendingApprovals.length ? (
              <div className="rounded-[1.25rem] border border-[rgba(255,194,107,0.22)] bg-[rgba(255,194,107,0.08)] p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
                  <ShieldAlert size={16} className="text-[var(--warning)]" />
                  Action proposals
                </div>
                <div className="mt-3 space-y-2">
                  {pendingApprovals.map((approval) => (
                    <p key={approval.id} className="text-sm leading-6 text-[var(--muted)]">
                      {approval.title}
                    </p>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </section>
      </aside>
    </div>
  );
}
