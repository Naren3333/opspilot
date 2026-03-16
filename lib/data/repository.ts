import { encryptString } from "@/lib/crypto";
import { getDemoStore } from "@/lib/data/demo-store";
import { buildDocumentChunks, summarizeText } from "@/lib/services/documents";
import type {
  AgentRun,
  ApprovalRequest,
  Citation,
  Conversation,
  DocumentRecord,
  EvalRun,
  MessageRecord,
  ProviderSettings,
  TicketComment,
  TicketPriority,
  TicketRecord,
  ToolActionProposal,
  ToolCallRecord,
  ToolActionType,
  Workspace,
  WorkspaceRole,
  WorkspaceSnapshot,
} from "@/lib/types";
import { slugify } from "@/lib/utils";

const DEFAULT_ACTOR = "ops.lead@northstar.example";

function nowIso() {
  return new Date().toISOString();
}

function createId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function getSnapshot() {
  return getDemoStore();
}

function scoreText(query: string, body: string) {
  const queryTokens = query
    .toLowerCase()
    .split(/\W+/)
    .filter((token) => token.length > 2);
  const haystack = body.toLowerCase();
  const matches = queryTokens.filter((token) => haystack.includes(token));
  return matches.length / Math.max(queryTokens.length, 1);
}

function touchConversation(conversationId: string) {
  const snapshot = getSnapshot();
  const conversation = snapshot.conversations.find((item) => item.id === conversationId);
  if (conversation) {
    conversation.updatedAt = nowIso();
  }
}

export async function listWorkspaces() {
  const snapshot = getSnapshot();
  return [snapshot.workspace];
}

export async function getWorkspaceBySlug(slug: string): Promise<Workspace | null> {
  const snapshot = getSnapshot();
  return snapshot.workspace.slug === slug ? snapshot.workspace : null;
}

export async function getWorkspaceSnapshot(slug: string): Promise<WorkspaceSnapshot | null> {
  const snapshot = getSnapshot();
  return snapshot.workspace.slug === slug ? snapshot : null;
}

export async function getWorkspaceRole(slug: string, email = DEFAULT_ACTOR): Promise<WorkspaceRole> {
  const snapshot = await getWorkspaceSnapshot(slug);
  return (
    snapshot?.members.find((member) => member.email.toLowerCase() === email.toLowerCase())?.role ?? "owner"
  );
}

export async function createWorkspace(input: { name: string; industry: string; ownerEmail: string }) {
  const snapshot = getSnapshot();
  snapshot.workspace = {
    id: createId("ws"),
    name: input.name,
    slug: slugify(input.name),
    industry: input.industry,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  snapshot.members = [
    {
      id: createId("member"),
      workspaceId: snapshot.workspace.id,
      email: input.ownerEmail,
      role: "owner",
    },
  ];
  snapshot.documents = [];
  snapshot.documentChunks = [];
  snapshot.tickets = [];
  snapshot.ticketComments = [];
  snapshot.conversations = [];
  snapshot.messages = [];
  snapshot.agentRuns = [];
  snapshot.toolCalls = [];
  snapshot.approvals = [];
  snapshot.evalRuns = [];
  snapshot.auditLogs = [];
  return snapshot.workspace;
}

export async function listTickets(slug: string) {
  const snapshot = await getWorkspaceSnapshot(slug);
  return [...(snapshot?.tickets ?? [])].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
}

export async function getTicketById(slug: string, ticketId: string) {
  const snapshot = await getWorkspaceSnapshot(slug);
  if (!snapshot) return null;
  const ticket = snapshot.tickets.find((item) => item.id === ticketId) ?? null;
  const comments = snapshot.ticketComments.filter((comment) => comment.ticketId === ticketId);
  return ticket ? { ticket, comments } : null;
}

export async function createManualTicket(input: {
  workspaceSlug: string;
  subject: string;
  summary: string;
  body: string;
  requester: string;
  assignee: string;
  priority: TicketPriority;
  tags: string[];
}) {
  const snapshot = await getWorkspaceSnapshot(input.workspaceSlug);
  if (!snapshot) {
    throw new Error("Workspace not found.");
  }

  const ticket: TicketRecord = {
    id: createId("ticket"),
    workspaceId: snapshot.workspace.id,
    number: Math.max(100, ...snapshot.tickets.map((item) => item.number)) + 1,
    subject: input.subject,
    summary: input.summary,
    body: input.body,
    status: "open",
    priority: input.priority,
    requester: input.requester,
    assignee: input.assignee,
    tags: input.tags,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };

  snapshot.tickets.unshift(ticket);
  snapshot.auditLogs.unshift({
    id: createId("audit"),
    workspaceId: snapshot.workspace.id,
    actor: DEFAULT_ACTOR,
    event: "ticket_created",
    target: ticket.id,
    detail: ticket.subject,
    createdAt: nowIso(),
  });

  return ticket;
}

export async function listDocuments(slug: string) {
  const snapshot = await getWorkspaceSnapshot(slug);
  return [...(snapshot?.documents ?? [])].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
}

export async function listApprovals(slug: string) {
  const snapshot = await getWorkspaceSnapshot(slug);
  return [...(snapshot?.approvals ?? [])].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function listAgentRuns(slug: string) {
  const snapshot = await getWorkspaceSnapshot(slug);
  return [...(snapshot?.agentRuns ?? [])].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function listEvalCases(slug: string) {
  const snapshot = await getWorkspaceSnapshot(slug);
  return snapshot?.evalCases ?? [];
}

export async function listEvalRuns(slug: string) {
  const snapshot = await getWorkspaceSnapshot(slug);
  return [...(snapshot?.evalRuns ?? [])].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function listAuditLogs(slug: string) {
  const snapshot = await getWorkspaceSnapshot(slug);
  return [...(snapshot?.auditLogs ?? [])].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function listConversations(slug: string) {
  const snapshot = await getWorkspaceSnapshot(slug);
  return [...(snapshot?.conversations ?? [])].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
}

export async function getConversationMessages(conversationId: string) {
  const snapshot = getSnapshot();
  return snapshot.messages
    .filter((message) => message.conversationId === conversationId)
    .sort((a, b) => (a.createdAt > b.createdAt ? 1 : -1));
}

export async function createConversation(slug: string, title: string) {
  const snapshot = await getWorkspaceSnapshot(slug);
  if (!snapshot) {
    throw new Error("Workspace not found.");
  }

  const conversation: Conversation = {
    id: createId("conversation"),
    workspaceId: snapshot.workspace.id,
    title,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };

  snapshot.conversations.unshift(conversation);
  return conversation;
}

export async function appendMessage(input: {
  conversationId: string;
  workspaceId: string;
  role: MessageRecord["role"];
  content: string;
  citations?: Citation[];
}) {
  const snapshot = getSnapshot();
  const message: MessageRecord = {
    id: createId("message"),
    conversationId: input.conversationId,
    workspaceId: input.workspaceId,
    role: input.role,
    content: input.content,
    citations: input.citations ?? [],
    createdAt: nowIso(),
  };
  snapshot.messages.push(message);
  touchConversation(input.conversationId);
  return message;
}

export async function createAgentRun(input: Omit<AgentRun, "id" | "createdAt" | "completedAt">) {
  const snapshot = getSnapshot();
  const run: AgentRun = {
    ...input,
    id: createId("run"),
    createdAt: nowIso(),
    completedAt: input.status === "completed" ? nowIso() : null,
  };
  snapshot.agentRuns.unshift(run);
  return run;
}

export async function updateAgentRun(
  runId: string,
  patch: Partial<Pick<AgentRun, "status" | "latencyMs" | "response" | "citations" | "toolActions">>,
) {
  const snapshot = getSnapshot();
  const run = snapshot.agentRuns.find((item) => item.id === runId);
  if (!run) return null;
  Object.assign(run, patch);
  if (patch.status === "completed" || patch.status === "awaiting_approval" || patch.status === "failed") {
    run.completedAt = nowIso();
  }
  return run;
}

export async function getProviderSettings(slug: string) {
  const snapshot = await getWorkspaceSnapshot(slug);
  return snapshot?.providerSettings ?? null;
}

export async function saveProviderSettings(slug: string, settings: ProviderSettings) {
  const snapshot = await getWorkspaceSnapshot(slug);
  if (!snapshot) {
    throw new Error("Workspace not found.");
  }

  snapshot.providerSettings = {
    ...settings,
    apiKey: settings.apiKey ? encryptString(settings.apiKey) : undefined,
    hasApiKey: Boolean(settings.apiKey),
    lastCheckedAt: nowIso(),
  };

  snapshot.auditLogs.unshift({
    id: createId("audit"),
    workspaceId: snapshot.workspace.id,
    actor: DEFAULT_ACTOR,
    event: "provider_settings_updated",
    target: "workspace_secrets",
    detail: `Provider set to ${settings.provider} using ${settings.chatModel}.`,
    createdAt: nowIso(),
  });

  return snapshot.providerSettings;
}

export async function searchKnowledgeBase(slug: string, query: string) {
  const snapshot = await getWorkspaceSnapshot(slug);
  if (!snapshot) return [];

  const documentHits = snapshot.documentChunks
    .map((chunk) => ({
      citation: {
        id: createId("citation"),
        sourceType: "document" as const,
        sourceId: chunk.documentId,
        label: chunk.title,
        excerpt: chunk.content.slice(0, 220),
        score: scoreText(query, `${chunk.title} ${chunk.content}`),
      },
      keywords: query.split(/\W+/).filter(Boolean),
    }))
    .filter((hit) => hit.citation.score > 0)
    .sort((a, b) => b.citation.score - a.citation.score)
    .slice(0, 3);

  const ticketHits = snapshot.tickets
    .map((ticket) => ({
      citation: {
        id: createId("citation"),
        sourceType: "ticket" as const,
        sourceId: ticket.id,
        label: `Ticket #${ticket.number}`,
        excerpt: `${ticket.subject}. ${ticket.summary}`.slice(0, 220),
        score: scoreText(query, `${ticket.subject} ${ticket.summary} ${ticket.body}`),
      },
      keywords: query.split(/\W+/).filter(Boolean),
    }))
    .filter((hit) => hit.citation.score > 0)
    .sort((a, b) => b.citation.score - a.citation.score)
    .slice(0, 3);

  return [...documentHits, ...ticketHits].sort((a, b) => b.citation.score - a.citation.score).slice(0, 4);
}

export async function queueDocument(input: {
  workspaceSlug: string;
  title: string;
  format: DocumentRecord["format"];
  rawText: string;
  sourcePath: string | null;
}) {
  const snapshot = await getWorkspaceSnapshot(input.workspaceSlug);
  if (!snapshot) {
    throw new Error("Workspace not found.");
  }

  const document: DocumentRecord = {
    id: createId("document"),
    workspaceId: snapshot.workspace.id,
    title: input.title,
    format: input.format,
    summary: summarizeText(input.rawText),
    status: "queued",
    sourcePath: input.sourcePath,
    rawText: input.rawText,
    chunkCount: 0,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };

  snapshot.documents.unshift(document);
  snapshot.auditLogs.unshift({
    id: createId("audit"),
    workspaceId: snapshot.workspace.id,
    actor: DEFAULT_ACTOR,
    event: "document_queued",
    target: document.id,
    detail: `Queued ${document.title} for ingestion.`,
    createdAt: nowIso(),
  });

  return document;
}

export async function drainQueuedDocuments(workspaceSlug: string) {
  const snapshot = await getWorkspaceSnapshot(workspaceSlug);
  if (!snapshot) return [];

  const processed: DocumentRecord[] = [];

  for (const document of snapshot.documents.filter((item) => item.status === "queued")) {
    document.status = "indexing";
    document.updatedAt = nowIso();
    const chunks = buildDocumentChunks(document.title, snapshot.workspace.id, document.id, document.rawText);
    snapshot.documentChunks = snapshot.documentChunks.filter((item) => item.documentId !== document.id);
    snapshot.documentChunks.push(...chunks);
    document.chunkCount = chunks.length;
    document.status = "indexed";
    document.updatedAt = nowIso();
    processed.push(document);
    snapshot.auditLogs.unshift({
      id: createId("audit"),
      workspaceId: snapshot.workspace.id,
      actor: "OpsPilot Worker",
      event: "document_indexed",
      target: document.id,
      detail: `Indexed ${chunks.length} chunks for ${document.title}.`,
      createdAt: nowIso(),
    });
  }

  return processed;
}

export async function queueEvalRun(workspaceSlug: string, caseId: string) {
  const snapshot = await getWorkspaceSnapshot(workspaceSlug);
  if (!snapshot) {
    throw new Error("Workspace not found.");
  }

  const evalRun: EvalRun = {
    id: createId("evalrun"),
    workspaceId: snapshot.workspace.id,
    caseId,
    status: "queued",
    score: null,
    notes: "Queued for evaluation.",
    output: "",
    createdAt: nowIso(),
    completedAt: null,
  };

  snapshot.evalRuns.unshift(evalRun);
  return evalRun;
}

export async function completeEvalRun(runId: string, output: string, score: number, notes: string) {
  const snapshot = getSnapshot();
  const evalRun = snapshot.evalRuns.find((item) => item.id === runId);
  if (!evalRun) {
    return null;
  }
  evalRun.status = "completed";
  evalRun.output = output;
  evalRun.score = score;
  evalRun.notes = notes;
  evalRun.completedAt = nowIso();
  return evalRun;
}

function applyToolExecution(snapshot: WorkspaceSnapshot, toolCall: ToolCallRecord) {
  const payload = toolCall.input;

  if (toolCall.action === "assignTicket") {
    const ticket = snapshot.tickets.find((item) => item.id === payload.ticketId);
    if (ticket && typeof payload.assignee === "string") {
      ticket.assignee = payload.assignee;
      ticket.updatedAt = nowIso();
    }
  }

  if (toolCall.action === "updateTicketPriority") {
    const ticket = snapshot.tickets.find((item) => item.id === payload.ticketId);
    if (ticket && typeof payload.priority === "string") {
      ticket.priority = payload.priority as TicketPriority;
      ticket.updatedAt = nowIso();
    }
  }

  if (toolCall.action === "createTicket") {
    const ticket: TicketRecord = {
      id: createId("ticket"),
      workspaceId: snapshot.workspace.id,
      number: Math.max(100, ...snapshot.tickets.map((item) => item.number)) + 1,
      subject: String(payload.subject ?? "New OpsPilot ticket"),
      summary: String(payload.summary ?? "Created from an approved AI action."),
      body: String(payload.body ?? ""),
      status: "open",
      priority: (payload.priority as TicketPriority) ?? "normal",
      requester: String(payload.requester ?? "unknown@example.com"),
      assignee: String(payload.assignee ?? "Unassigned"),
      tags: Array.isArray(payload.tags) ? payload.tags.map(String) : ["ai-created"],
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    snapshot.tickets.unshift(ticket);
  }

  if (toolCall.action === "draftReply") {
    const comment: TicketComment = {
      id: createId("comment"),
      ticketId: String(payload.ticketId),
      author: "OpsPilot Draft",
      body: String(payload.reply ?? "Draft approved."),
      createdAt: nowIso(),
    };
    snapshot.ticketComments.unshift(comment);
  }
}

export async function createApprovalsForRun(
  workspaceSlug: string,
  runId: string,
  proposals: ToolActionProposal[],
) {
  const snapshot = await getWorkspaceSnapshot(workspaceSlug);
  if (!snapshot) return [];

  const created: ApprovalRequest[] = [];

  for (const proposal of proposals) {
    const toolCall: ToolCallRecord = {
      id: createId("tool"),
      workspaceId: snapshot.workspace.id,
      runId,
      action: proposal.action,
      status: "proposed",
      input: proposal.payload,
      output: {},
      createdAt: nowIso(),
    };

    const approval: ApprovalRequest = {
      id: createId("approval"),
      workspaceId: snapshot.workspace.id,
      runId,
      toolCallId: toolCall.id,
      title: buildApprovalTitle(proposal.action, proposal.payload),
      summary: proposal.reason,
      status: "pending",
      requestedBy: "OpsPilot",
      decidedBy: null,
      createdAt: nowIso(),
      decidedAt: null,
    };

    snapshot.toolCalls.unshift(toolCall);
    snapshot.approvals.unshift(approval);
    snapshot.auditLogs.unshift({
      id: createId("audit"),
      workspaceId: snapshot.workspace.id,
      actor: "OpsPilot",
      event: "approval_requested",
      target: approval.toolCallId,
      detail: approval.title,
      createdAt: nowIso(),
    });
    created.push(approval);
  }

  return created;
}

function buildApprovalTitle(action: ToolActionType, payload: Record<string, unknown>) {
  switch (action) {
    case "assignTicket":
      return `Assign ${String(payload.ticketId ?? "ticket")} to ${String(payload.assignee ?? "owner")}`;
    case "updateTicketPriority":
      return `Update ${String(payload.ticketId ?? "ticket")} to ${String(payload.priority ?? "new")} priority`;
    case "createTicket":
      return `Create ticket: ${String(payload.subject ?? "Untitled")}`;
    case "draftReply":
      return `Save approved draft reply for ${String(payload.ticketId ?? "ticket")}`;
    default:
      return `Approve ${action}`;
  }
}

export async function decideApproval(approvalId: string, decision: "approved" | "rejected", actor = DEFAULT_ACTOR) {
  const snapshot = getSnapshot();
  const approval = snapshot.approvals.find((item) => item.id === approvalId);
  if (!approval) {
    return null;
  }

  approval.status = decision;
  approval.decidedBy = actor;
  approval.decidedAt = nowIso();

  const toolCall = snapshot.toolCalls.find((item) => item.id === approval.toolCallId);
  if (toolCall) {
    toolCall.status = decision;
    if (decision === "approved") {
      applyToolExecution(snapshot, toolCall);
      toolCall.status = "executed";
    }
  }

  snapshot.auditLogs.unshift({
    id: createId("audit"),
    workspaceId: approval.workspaceId,
    actor,
    event: decision === "approved" ? "approval_approved" : "approval_rejected",
    target: approval.toolCallId,
    detail: approval.title,
    createdAt: nowIso(),
  });

  return approval;
}
