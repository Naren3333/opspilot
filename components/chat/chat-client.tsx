"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowUp,
  Bot,
  Check,
  FileCode2,
  LoaderCircle,
  MessageSquarePlus,
  ShieldAlert,
  Sparkles,
  Upload,
} from "lucide-react";

import type { ApprovalRequest, Citation, Conversation, DocumentRecord, MessageRecord } from "@/lib/types";
import { cn, formatRelativeTime } from "@/lib/utils";

interface ChatClientProps {
  workspaceSlug: string;
  initialConversationId: string | null;
  initialConversationTitle: string | null;
  initialSelectedDocumentIds: string[];
  initialConversations: Conversation[];
  initialDocuments: DocumentRecord[];
  initialMessages: MessageRecord[];
  pendingApprovalCount: number;
}

interface ArtifactItem {
  id: string;
  label: string;
  subtitle: string;
  content: string;
  kind: "evidence" | "file";
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

function buildReviewPrompt(selectedDocuments: DocumentRecord[]) {
  if (!selectedDocuments.length) {
    return "Review this like a senior engineer. Call out bugs, regressions, security risks, and missing tests first.";
  }

  const names = selectedDocuments
    .slice(0, 3)
    .map((document) => document.sourcePath ?? document.title)
    .join(", ");

  return `Review the selected files (${names}) like a senior engineer. Call out bugs, regressions, security risks, and missing tests first.`;
}

function truncateArtifact(text: string, length = 2200) {
  if (text.length <= length) {
    return text;
  }

  return `${text.slice(0, length).trimEnd()}\n\n...`;
}

export function ChatClient({
  workspaceSlug,
  initialConversationId,
  initialConversationTitle,
  initialSelectedDocumentIds,
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
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>(initialSelectedDocumentIds);
  const [activeArtifactId, setActiveArtifactId] = useState<string | null>(null);

  useEffect(() => {
    setMessages(initialMessages);
    setConversationId(initialConversationId);
    setConversationTitle(initialConversationTitle);
    setSelectedDocumentIds(initialConversationId ? initialSelectedDocumentIds : []);
    setPendingApprovals([]);
  }, [initialConversationId, initialConversationTitle, initialMessages, initialSelectedDocumentIds]);

  useEffect(() => {
    setConversations(initialConversations);
  }, [initialConversations]);

  useEffect(() => {
    setDocuments(initialDocuments);
    setSelectedDocumentIds((current) => {
      const validIds = new Set(initialDocuments.map((document) => document.id));
      return current.filter((id) => validIds.has(id));
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

  const artifacts = useMemo(() => {
    const evidenceArtifacts: ArtifactItem[] = lastAssistantCitations.map((citation) => ({
      id: `citation:${citation.id}`,
      label: citation.label,
      subtitle: "Evidence",
      content: citation.excerpt,
      kind: "evidence",
    }));

    const fileArtifacts: ArtifactItem[] = selectedDocuments.map((document) => ({
      id: `document:${document.id}`,
      label: document.sourcePath ?? document.title,
      subtitle: "Thread context",
      content: truncateArtifact(document.rawText),
      kind: "file",
    }));

    return [...evidenceArtifacts, ...fileArtifacts];
  }, [lastAssistantCitations, selectedDocuments]);

  const activeArtifact = useMemo(
    () => artifacts.find((artifact) => artifact.id === activeArtifactId) ?? artifacts[0] ?? null,
    [activeArtifactId, artifacts],
  );

  useEffect(() => {
    if (!artifacts.length) {
      setActiveArtifactId(null);
      return;
    }

    if (!activeArtifactId || !artifacts.some((artifact) => artifact.id === activeArtifactId)) {
      setActiveArtifactId(artifacts[0].id);
    }
  }, [activeArtifactId, artifacts]);

  function syncConversationList(
    nextConversationId: string,
    nextTitle: string,
    updatedAt: string,
    contextDocumentIds: string[],
  ) {
    setConversations((current) => {
      const existing = current.find((conversation) => conversation.id === nextConversationId);
      const nextConversation: Conversation = existing
        ? { ...existing, title: nextTitle, contextDocumentIds, updatedAt }
        : {
            id: nextConversationId,
            workspaceId: workspaceSlug,
            title: nextTitle,
            contextDocumentIds,
            createdAt: updatedAt,
            updatedAt,
          };

      return [
        nextConversation,
        ...current.filter((conversation) => conversation.id !== nextConversationId),
      ];
    });
  }

  async function persistThreadContext(nextIds: string[], targetConversationId = conversationId) {
    if (!targetConversationId) {
      return;
    }

    const response = await fetch(`/api/conversations/${targetConversationId}/context`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        workspaceSlug,
        documentIds: nextIds,
      }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      throw new Error(payload?.error ?? "Failed to save thread context.");
    }

    syncConversationList(
      targetConversationId,
      conversationTitle ?? "New thread",
      new Date().toISOString(),
      nextIds,
    );
  }

  async function streamMessage(messageOverride?: string) {
    const userText = (messageOverride ?? input).trim() || buildReviewPrompt(selectedDocuments);
    if (busy) return;

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
      let nextConversationTitle = conversationTitle ?? "New thread";

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
                  ? {
                      ...message,
                      conversationId: nextConversationId ?? message.conversationId,
                      citations: entry.citations ?? [],
                    }
                  : message.role === "user" && index === current.length - 2
                    ? { ...message, conversationId: nextConversationId ?? message.conversationId }
                    : message,
              ),
            );

            setPendingApprovals(entry.approvals ?? []);

            if (nextConversationId) {
              syncConversationList(
                nextConversationId,
                nextConversationTitle,
                new Date().toISOString(),
                selectedDocumentIds,
              );

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
      setUploadStatus("Choose file(s) first.");
      return;
    }

    setUploadBusy(true);
    setUploadStatus("Uploading...");
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
        const merged = [
          ...normalizedUploads,
          ...current.filter((document) => !normalizedUploads.some((item) => item.id === document.id)),
        ];
        return merged.sort((left, right) => (left.updatedAt < right.updatedAt ? 1 : -1));
      });

      const nextIds = [...new Set([...normalizedUploads.map((document) => document.id), ...selectedDocumentIds])];
      setSelectedDocumentIds(nextIds);
      setUploadStatus(`Indexed ${normalizedUploads.length} file${normalizedUploads.length === 1 ? "" : "s"}.`);
      form.reset();

      if (conversationId) {
        await persistThreadContext(nextIds, conversationId);
      }
    } catch (uploadError) {
      setUploadStatus(uploadError instanceof Error ? uploadError.message : "Upload failed.");
    } finally {
      setUploadBusy(false);
    }
  }

  function handleNewThread() {
    setConversationId(null);
    setConversationTitle(null);
    setMessages([]);
    setPendingApprovals([]);
    setError(null);
    setInput("");
    setSelectedDocumentIds([]);
    setUploadStatus(null);
    router.replace(`/w/${workspaceSlug}/chat`);
  }

  function selectThread(nextConversation: Conversation) {
    router.push(`/w/${workspaceSlug}/chat?conversation=${nextConversation.id}`);
  }

  async function toggleDocument(documentId: string) {
    const nextIds = selectedDocumentIds.includes(documentId)
      ? selectedDocumentIds.filter((id) => id !== documentId)
      : [...selectedDocumentIds, documentId];

    setSelectedDocumentIds(nextIds);

    try {
      if (conversationId) {
        await persistThreadContext(nextIds, conversationId);
      }
    } catch (persistError) {
      setError(persistError instanceof Error ? persistError.message : "Failed to save thread context.");
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[16rem_minmax(0,1fr)_25rem]">
      <aside className="grid h-[calc(100vh-2rem)] min-h-[44rem] grid-rows-[auto_1fr] overflow-hidden rounded-[1.35rem] border border-[var(--line)] bg-[rgba(10,12,18,0.94)]">
        <div className="border-b border-[var(--line)] p-3">
          <button
            type="button"
            onClick={handleNewThread}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-[var(--foreground)] transition hover:bg-[rgba(255,255,255,0.04)]"
          >
            <MessageSquarePlus size={16} />
            New thread
          </button>
        </div>

        <div className="overflow-y-auto p-3">
          <div className="space-y-1">
            {conversations.map((conversation) => (
              <button
                key={conversation.id}
                type="button"
                onClick={() => selectThread(conversation)}
                className={cn(
                  "w-full rounded-xl px-3 py-2.5 text-left transition",
                  conversation.id === conversationId
                    ? "bg-[rgba(255,255,255,0.06)] text-[var(--foreground)]"
                    : "text-[var(--muted)] hover:bg-[rgba(255,255,255,0.03)] hover:text-[var(--foreground)]",
                )}
              >
                <p className="truncate text-sm font-medium">{conversation.title}</p>
                <p className="mt-1 text-xs text-[var(--muted)]">{formatRelativeTime(conversation.updatedAt)}</p>
                {conversation.contextDocumentIds.length ? (
                  <p className="mt-2 text-[11px] text-[var(--muted)]">
                    {conversation.contextDocumentIds.length} file
                    {conversation.contextDocumentIds.length === 1 ? "" : "s"}
                  </p>
                ) : null}
              </button>
            ))}
          </div>
        </div>
      </aside>

      <section className="grid h-[calc(100vh-2rem)] min-h-[44rem] grid-rows-[auto_1fr_auto] overflow-hidden rounded-[1.35rem] border border-[var(--line)] bg-[rgba(10,12,18,0.94)]">
        <div className="border-b border-[var(--line)] px-5 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-xl font-semibold tracking-tight text-[var(--foreground)]">Review</h1>
              <p className="mt-1 truncate text-sm text-[var(--muted)]">{conversationTitle ?? "New thread"}</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
              {selectedDocuments.length ? (
                <span className="rounded-full bg-[rgba(255,255,255,0.06)] px-3 py-1">
                  {selectedDocuments.length} file{selectedDocuments.length === 1 ? "" : "s"}
                </span>
              ) : null}
              {pendingApprovalCount + pendingApprovals.length > 0 ? (
                <span className="rounded-full bg-[rgba(255,194,107,0.12)] px-3 py-1 text-[var(--warning)]">
                  {pendingApprovalCount + pendingApprovals.length} approvals
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <div ref={scrollRef} className="overflow-y-auto px-5 py-5">
          <div className="space-y-6">
            {messages.length === 0 ? (
              <div className="max-w-2xl">
                <p className="text-base font-medium text-[var(--foreground)]">Drop files and start reviewing.</p>
                <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                  Each thread keeps its own file context now. Pick files on the right, then ask for a review.
                </p>
              </div>
            ) : null}

            {messages.map((message) => (
              <div
                key={message.id}
                className={cn("space-y-3", message.role === "user" ? "ml-auto max-w-2xl" : "max-w-4xl")}
              >
                <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-[var(--muted)]">
                  {message.role === "assistant" ? <Bot size={14} /> : <Sparkles size={14} />}
                  <span>{message.role}</span>
                  <span>{formatRelativeTime(message.createdAt)}</span>
                </div>

                <div
                  className={cn(
                    "rounded-2xl border px-4 py-3 text-sm leading-7",
                    message.role === "user"
                      ? "border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)]"
                      : "border-[var(--line)] bg-[rgba(255,255,255,0.02)]",
                  )}
                >
                  <p className="whitespace-pre-wrap text-[var(--foreground)]">{message.content || "..."}</p>
                </div>

                {message.citations.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {message.citations.map((citation) => (
                      <button
                        key={citation.id}
                        type="button"
                        onClick={() => setActiveArtifactId(`citation:${citation.id}`)}
                        className="rounded-full border border-[var(--line)] bg-[rgba(255,255,255,0.03)] px-3 py-1 text-xs text-[var(--foreground)] transition hover:bg-[rgba(255,255,255,0.06)]"
                      >
                        {citation.label}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}

            {pendingApprovals.length ? (
              <div className="max-w-4xl rounded-2xl border border-[rgba(255,194,107,0.18)] bg-[rgba(255,194,107,0.06)] px-4 py-3">
                <div className="flex items-center gap-2 text-sm font-medium text-[var(--foreground)]">
                  <ShieldAlert size={16} className="text-[var(--warning)]" />
                  Pending actions
                </div>
                <div className="mt-2 space-y-1">
                  {pendingApprovals.map((approval) => (
                    <p key={approval.id} className="text-sm text-[var(--muted)]">
                      {approval.title}
                    </p>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="border-t border-[var(--line)] p-4">
          {selectedDocuments.length ? (
            <div className="mb-3 flex flex-wrap gap-2">
              {selectedDocuments.map((document) => (
                <button
                  key={document.id}
                  type="button"
                  onClick={() => setActiveArtifactId(`document:${document.id}`)}
                  className="rounded-full bg-[rgba(255,255,255,0.06)] px-3 py-1 text-xs text-[var(--foreground)]"
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
            className="rounded-2xl border border-[var(--line)] bg-[rgba(255,255,255,0.02)] p-3"
          >
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              rows={4}
              placeholder="Ask for a PR review, bug scan, or test plan."
              className="w-full resize-none bg-transparent px-1 py-1 text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--muted)]"
            />

            <div className="mt-3 flex items-center justify-between gap-3 border-t border-[var(--line)] pt-3">
              <p className="text-xs text-[var(--muted)]">
                {selectedDocuments.length
                  ? `${selectedDocuments.length} file(s) in this thread`
                  : "No files selected"}
              </p>
              <button
                type="submit"
                disabled={busy}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--foreground)] text-[var(--background)] transition disabled:opacity-60"
              >
                {busy ? <LoaderCircle size={16} className="animate-spin" /> : <ArrowUp size={16} />}
              </button>
            </div>
          </form>

          {error ? <p className="mt-3 text-sm text-[var(--danger)]">{error}</p> : null}
        </div>
      </section>

      <aside className="grid h-[calc(100vh-2rem)] min-h-[44rem] grid-rows-[auto_auto_1fr] gap-4">
        <section className="rounded-[1.35rem] border border-[var(--line)] bg-[rgba(10,12,18,0.94)] p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-[var(--foreground)]">
            <Upload size={16} />
            Add files
          </div>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            Files you add here become available for this thread. Selected files are saved with the thread.
          </p>

          <form onSubmit={handleUpload} className="mt-4 space-y-3">
            <input
              name="files"
              type="file"
              multiple
              accept={FILE_ACCEPT}
              className="w-full rounded-2xl border border-dashed border-[var(--line)] bg-[rgba(255,255,255,0.03)] px-4 py-4 text-sm text-[var(--muted)]"
            />
            <button
              type="submit"
              disabled={uploadBusy}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--line)] px-4 py-3 text-sm text-[var(--foreground)] transition hover:bg-[rgba(255,255,255,0.04)] disabled:opacity-60"
            >
              {uploadBusy ? <LoaderCircle size={16} className="animate-spin" /> : <Upload size={16} />}
              {uploadBusy ? "Uploading" : "Upload files"}
            </button>
          </form>

          {uploadStatus ? <p className="mt-3 text-sm text-[var(--muted)]">{uploadStatus}</p> : null}
        </section>

        <section className="overflow-hidden rounded-[1.35rem] border border-[var(--line)] bg-[rgba(10,12,18,0.94)]">
          <div className="border-b border-[var(--line)] px-4 py-3">
            <p className="text-sm font-medium text-[var(--foreground)]">Thread context</p>
          </div>
          <div className="max-h-64 space-y-2 overflow-y-auto p-4">
            {documents.map((document) => {
              const selected = selectedDocumentIds.includes(document.id);
              return (
                <button
                  key={document.id}
                  type="button"
                  onClick={() => void toggleDocument(document.id)}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-xl border px-3 py-3 text-left transition",
                    selected
                      ? "border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.06)]"
                      : "border-[var(--line)] bg-[rgba(255,255,255,0.02)] hover:bg-[rgba(255,255,255,0.04)]",
                  )}
                >
                  <span className="mt-0.5 text-[var(--foreground)]">
                    {selected ? <Check size={15} /> : <FileCode2 size={15} />}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-[var(--foreground)]">
                      {document.sourcePath ?? document.title}
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-[var(--muted)]">{document.summary}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="overflow-hidden rounded-[1.35rem] border border-[var(--line)] bg-[rgba(10,12,18,0.94)]">
          <div className="border-b border-[var(--line)] px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-medium text-[var(--foreground)]">
              <Sparkles size={16} />
              Artifacts
            </div>
          </div>

          <div className="border-b border-[var(--line)] px-4 py-3">
            <div className="flex flex-wrap gap-2">
              {artifacts.length ? (
                artifacts.map((artifact) => (
                  <button
                    key={artifact.id}
                    type="button"
                    onClick={() => setActiveArtifactId(artifact.id)}
                    className={cn(
                      "rounded-full px-3 py-1 text-xs transition",
                      activeArtifact?.id === artifact.id
                        ? "bg-[rgba(255,255,255,0.12)] text-[var(--foreground)]"
                        : "bg-[rgba(255,255,255,0.04)] text-[var(--muted)] hover:text-[var(--foreground)]",
                    )}
                  >
                    {artifact.label}
                  </button>
                ))
              ) : (
                <p className="text-sm text-[var(--muted)]">Artifacts from citations and thread files will show here.</p>
              )}
            </div>
          </div>

          <div className="h-full overflow-y-auto p-4">
            {activeArtifact ? (
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-[var(--foreground)]">{activeArtifact.label}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                    {activeArtifact.subtitle}
                  </p>
                </div>
                <pre className="overflow-x-auto rounded-2xl border border-[var(--line)] bg-[rgba(255,255,255,0.02)] p-4 font-mono text-xs leading-6 text-[var(--foreground)] whitespace-pre-wrap">
                  {activeArtifact.content}
                </pre>
              </div>
            ) : (
              <p className="text-sm text-[var(--muted)]">
                Run a review or select files to populate the artifact pane.
              </p>
            )}
          </div>
        </section>
      </aside>
    </div>
  );
}
