export type WorkspaceRole = "owner" | "admin" | "analyst";
export type ProviderType = "mock" | "openai-compatible" | "ollama";
export type DocumentStatus = "queued" | "indexing" | "indexed" | "failed";
export type TicketStatus = "open" | "pending" | "resolved";
export type TicketPriority = "low" | "normal" | "high" | "urgent";
export type ApprovalStatus = "pending" | "approved" | "rejected" | "expired";
export type AgentRunStatus = "queued" | "running" | "awaiting_approval" | "completed" | "failed";
export type EvalRunStatus = "queued" | "running" | "completed" | "failed";
export type ToolActionType =
  | "searchDocs"
  | "searchTickets"
  | "draftReply"
  | "createTicket"
  | "updateTicketPriority"
  | "assignTicket";

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  industry: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceMember {
  id: string;
  workspaceId: string;
  email: string;
  role: WorkspaceRole;
}

export interface ProviderSettings {
  provider: ProviderType;
  baseUrl: string;
  chatModel: string;
  embeddingModel: string;
  apiKey?: string;
  hasApiKey?: boolean;
  lastCheckedAt?: string | null;
}

export interface DocumentRecord {
  id: string;
  workspaceId: string;
  title: string;
  format: "pdf" | "md" | "txt";
  summary: string;
  status: DocumentStatus;
  sourcePath: string | null;
  rawText: string;
  chunkCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentChunk {
  id: string;
  workspaceId: string;
  documentId: string;
  title: string;
  content: string;
  tokenCount: number;
  embedding?: number[];
}

export interface TicketRecord {
  id: string;
  workspaceId: string;
  number: number;
  subject: string;
  summary: string;
  body: string;
  status: TicketStatus;
  priority: TicketPriority;
  requester: string;
  assignee: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface TicketComment {
  id: string;
  ticketId: string;
  author: string;
  body: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  workspaceId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface Citation {
  id: string;
  sourceType: "document" | "ticket";
  sourceId: string;
  label: string;
  excerpt: string;
  score: number;
}

export interface MessageRecord {
  id: string;
  conversationId: string;
  workspaceId: string;
  role: "user" | "assistant" | "system";
  content: string;
  citations: Citation[];
  createdAt: string;
}

export interface ToolActionProposal {
  id: string;
  workspaceId: string;
  runId: string;
  action: ToolActionType;
  reason: string;
  payload: Record<string, unknown>;
}

export interface ToolCallRecord {
  id: string;
  workspaceId: string;
  runId: string;
  action: ToolActionType;
  status: "proposed" | "approved" | "rejected" | "executed";
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  createdAt: string;
}

export interface AgentRun {
  id: string;
  workspaceId: string;
  conversationId: string;
  promptVersion: string;
  status: AgentRunStatus;
  provider: string;
  model: string;
  latencyMs: number;
  prompt: string;
  response: string;
  citations: Citation[];
  toolActions: ToolActionProposal[];
  createdAt: string;
  completedAt: string | null;
}

export interface ApprovalRequest {
  id: string;
  workspaceId: string;
  runId: string;
  toolCallId: string;
  title: string;
  summary: string;
  status: ApprovalStatus;
  requestedBy: string;
  decidedBy: string | null;
  createdAt: string;
  decidedAt: string | null;
}

export interface EvalCase {
  id: string;
  workspaceId: string;
  title: string;
  prompt: string;
  expected: string[];
  requiresCitation: boolean;
}

export interface EvalRun {
  id: string;
  workspaceId: string;
  caseId: string;
  status: EvalRunStatus;
  score: number | null;
  notes: string;
  output: string;
  createdAt: string;
  completedAt: string | null;
}

export interface AuditLog {
  id: string;
  workspaceId: string;
  actor: string;
  event: string;
  target: string;
  detail: string;
  createdAt: string;
}

export interface WorkspaceSnapshot {
  workspace: Workspace;
  members: WorkspaceMember[];
  providerSettings: ProviderSettings;
  documents: DocumentRecord[];
  documentChunks: DocumentChunk[];
  tickets: TicketRecord[];
  ticketComments: TicketComment[];
  conversations: Conversation[];
  messages: MessageRecord[];
  agentRuns: AgentRun[];
  toolCalls: ToolCallRecord[];
  approvals: ApprovalRequest[];
  evalCases: EvalCase[];
  evalRuns: EvalRun[];
  auditLogs: AuditLog[];
}

export interface ChatRequest {
  workspaceSlug: string;
  conversationId?: string;
  message: string;
}

export interface ChatEnvelope {
  type: "chunk" | "meta" | "error" | "done";
  content?: string;
  conversationId?: string;
  runId?: string;
  citations?: Citation[];
  approvals?: ApprovalRequest[];
  toolActions?: ToolActionProposal[];
  error?: string;
}

export interface SearchHit {
  citation: Citation;
  keywords: string[];
}
