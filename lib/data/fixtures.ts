import { env } from "@/lib/env";
import { buildDocumentChunks } from "@/lib/services/documents";
import type {
  AgentRun,
  ApprovalRequest,
  AuditLog,
  Conversation,
  DocumentRecord,
  EvalCase,
  EvalRun,
  MessageRecord,
  ProviderSettings,
  TicketComment,
  TicketRecord,
  ToolCallRecord,
  Workspace,
  WorkspaceMember,
  WorkspaceSnapshot,
} from "@/lib/types";

const workspace: Workspace = {
  id: "ws_northstar",
  name: "Northstar Support",
  slug: env.demoWorkspaceSlug,
  industry: "B2B SaaS",
  createdAt: "2026-03-01T09:00:00.000Z",
  updatedAt: "2026-03-17T00:00:00.000Z",
};

const providerSettings: ProviderSettings = {
  provider: "mock",
  baseUrl: env.ollamaBaseUrl,
  chatModel: env.ollamaChatModel,
  embeddingModel: env.ollamaEmbeddingModel,
  hasApiKey: false,
  lastCheckedAt: null,
};

const members: WorkspaceMember[] = [
  {
    id: "member_owner_1",
    workspaceId: workspace.id,
    email: "ops.lead@northstar.example",
    role: "owner",
  },
  {
    id: "member_admin_1",
    workspaceId: workspace.id,
    email: "queue.manager@northstar.example",
    role: "admin",
  },
  {
    id: "member_analyst_1",
    workspaceId: workspace.id,
    email: "analyst@northstar.example",
    role: "analyst",
  },
];

const documents: DocumentRecord[] = [
  {
    id: "doc_billing",
    workspaceId: workspace.id,
    title: "Billing and refunds handbook",
    format: "md",
    summary:
      "Explains refund windows, invoice corrections, and how support should handle upgrade disputes.",
    status: "indexed",
    sourcePath: "playbooks/billing-refunds.md",
    rawText:
      "Customers on monthly plans can request a refund within 14 days of the first successful charge. Annual plans are not automatically refundable, but support may offer a prorated credit when duplicate billing or onboarding blockers are confirmed. Invoice corrections must be acknowledged within one business day. Upgrade disputes should be triaged as high priority if the customer is blocked from work or has duplicate invoices. If a refund is approved, support must document the reason, refund amount, and confirmation timestamp in the ticket before closing the thread.",
    chunkCount: 0,
    createdAt: "2026-03-02T09:15:00.000Z",
    updatedAt: "2026-03-02T09:15:00.000Z",
  },
  {
    id: "doc_sso",
    workspaceId: workspace.id,
    title: "SSO troubleshooting guide",
    format: "md",
    summary:
      "Covers SAML mismatch errors, JIT provisioning failures, and the required escalation path for repeated outages.",
    status: "indexed",
    sourcePath: "runbooks/sso-guide.md",
    rawText:
      "When SSO login fails with a SAML audience mismatch, support should first confirm the identity provider certificate was rotated correctly and that the ACS URL matches the production environment. If the customer reports a JIT provisioning failure, collect the timestamp, user email, and IdP trace ID. Three or more failures within a 30 minute window should be escalated to the platform on-call engineer. Support may offer a temporary password reset only for enterprise accounts whose workspace owner has already approved emergency fallback access.",
    chunkCount: 0,
    createdAt: "2026-03-03T10:20:00.000Z",
    updatedAt: "2026-03-03T10:20:00.000Z",
  },
  {
    id: "doc_status",
    workspaceId: workspace.id,
    title: "Incident status communication playbook",
    format: "txt",
    summary:
      "Sets expectations for external updates, empathy language, and follow-up tickets after service disruptions.",
    status: "indexed",
    sourcePath: "playbooks/status-comms.txt",
    rawText:
      "During an active incident, support should acknowledge impact quickly, avoid sharing unverified root causes, and link customers to the live status page. Public updates should happen at least every 30 minutes while customer-facing impact continues. Once service is restored, support should summarize the customer impact, note any available workarounds used during the incident, and create a follow-up ticket for any promised credits or engineering actions.",
    chunkCount: 0,
    createdAt: "2026-03-04T11:45:00.000Z",
    updatedAt: "2026-03-04T11:45:00.000Z",
  },
];

const tickets: TicketRecord[] = [
  {
    id: "ticket_101",
    workspaceId: workspace.id,
    number: 101,
    subject: "Duplicate annual invoice after plan upgrade",
    summary: "Customer was billed twice after moving from monthly to annual.",
    body:
      "The finance team at Juniper Labs upgraded to annual and was charged the new invoice while the previous monthly cycle still posted. They want a refund and an explanation of whether access will be interrupted.",
    status: "open",
    priority: "high",
    requester: "ava@juniperlabs.io",
    assignee: "Mina Patel",
    tags: ["billing", "refund"],
    createdAt: "2026-03-15T06:20:00.000Z",
    updatedAt: "2026-03-16T10:45:00.000Z",
  },
  {
    id: "ticket_102",
    workspaceId: workspace.id,
    number: 102,
    subject: "SSO users locked out after IdP certificate rotation",
    summary: "Multiple enterprise users cannot sign in after an identity provider change.",
    body:
      "Ops engineers at Northfield report that all new SSO logins are failing. They rotated an Okta certificate this morning and now receive a SAML audience mismatch error.",
    status: "pending",
    priority: "urgent",
    requester: "sre@northfield.co",
    assignee: "Leo Chen",
    tags: ["sso", "enterprise", "incident"],
    createdAt: "2026-03-16T08:05:00.000Z",
    updatedAt: "2026-03-16T09:40:00.000Z",
  },
  {
    id: "ticket_103",
    workspaceId: workspace.id,
    number: 103,
    subject: "Request for service credit after API degradation",
    summary: "Customer wants a billing credit tied to yesterday's partial outage.",
    body:
      "Following the API incident, a customer is requesting confirmation that a service credit will be issued. They also want a post-incident summary they can share internally.",
    status: "open",
    priority: "normal",
    requester: "ops@cindercommerce.com",
    assignee: "Priya Raman",
    tags: ["incident", "credits"],
    createdAt: "2026-03-16T12:30:00.000Z",
    updatedAt: "2026-03-16T13:00:00.000Z",
  },
];

const ticketComments: TicketComment[] = [
  {
    id: "comment_1",
    ticketId: "ticket_101",
    author: "Mina Patel",
    body: "Confirmed the duplicate invoice ID and asked finance to verify the charge window.",
    createdAt: "2026-03-16T09:10:00.000Z",
  },
  {
    id: "comment_2",
    ticketId: "ticket_102",
    author: "Leo Chen",
    body: "Customer shared the new ACS URL and a failing SAML response trace.",
    createdAt: "2026-03-16T09:18:00.000Z",
  },
  {
    id: "comment_3",
    ticketId: "ticket_103",
    author: "Priya Raman",
    body: "Drafted a status-page-based reply but waiting on policy confirmation for credits.",
    createdAt: "2026-03-16T13:12:00.000Z",
  },
];

const conversations: Conversation[] = [
  {
    id: "conversation_1",
    workspaceId: workspace.id,
    title: "Morning queue triage",
    createdAt: "2026-03-16T08:00:00.000Z",
    updatedAt: "2026-03-16T08:40:00.000Z",
  },
];

const messages: MessageRecord[] = [
  {
    id: "message_1",
    conversationId: "conversation_1",
    workspaceId: workspace.id,
    role: "user",
    content: "Summarize the riskiest tickets in the queue this morning.",
    citations: [],
    createdAt: "2026-03-16T08:10:00.000Z",
  },
  {
    id: "message_2",
    conversationId: "conversation_1",
    workspaceId: workspace.id,
    role: "assistant",
    content:
      "Ticket #102 is the highest risk because the SSO outage blocks enterprise users and the runbook says three failures in 30 minutes should escalate to on-call. Ticket #101 is next because the billing handbook treats duplicate invoices that block access as high priority.",
    citations: [
      {
        id: "citation_1",
        sourceType: "ticket",
        sourceId: "ticket_102",
        label: "Ticket #102",
        excerpt: "All new SSO logins are failing after an Okta certificate rotation.",
        score: 0.92,
      },
      {
        id: "citation_2",
        sourceType: "document",
        sourceId: "doc_sso",
        label: "SSO troubleshooting guide",
        excerpt: "Three or more failures within a 30 minute window should be escalated to the platform on-call engineer.",
        score: 0.88,
      },
    ],
    createdAt: "2026-03-16T08:11:00.000Z",
  },
];

const agentRuns: AgentRun[] = [
  {
    id: "run_1",
    workspaceId: workspace.id,
    conversationId: "conversation_1",
    promptVersion: "2026-03-17.v1",
    status: "awaiting_approval",
    provider: "mock",
    model: "demo-narrator",
    latencyMs: 2420,
    prompt: "Summarize the riskiest tickets in the queue this morning.",
    response:
      "Ticket #102 is the highest risk because the SSO outage blocks enterprise users and the runbook says three failures in 30 minutes should escalate to on-call. Ticket #101 is next because the billing handbook treats duplicate invoices that block access as high priority.",
    citations: [
      {
        id: "citation_1",
        sourceType: "ticket",
        sourceId: "ticket_102",
        label: "Ticket #102",
        excerpt: "All new SSO logins are failing after an Okta certificate rotation.",
        score: 0.92,
      },
    ],
    toolActions: [
      {
        id: "action_1",
        workspaceId: workspace.id,
        runId: "run_1",
        action: "assignTicket",
        reason: "Escalate the urgent SSO issue to the enterprise on-call owner.",
        payload: {
          ticketId: "ticket_102",
          assignee: "Platform On-call",
        },
      },
    ],
    createdAt: "2026-03-16T08:11:00.000Z",
    completedAt: "2026-03-16T08:11:03.000Z",
  },
];

const toolCalls: ToolCallRecord[] = [
  {
    id: "tool_1",
    workspaceId: workspace.id,
    runId: "run_1",
    action: "assignTicket",
    status: "proposed",
    input: {
      ticketId: "ticket_102",
      assignee: "Platform On-call",
    },
    output: {},
    createdAt: "2026-03-16T08:11:03.000Z",
  },
];

const approvals: ApprovalRequest[] = [
  {
    id: "approval_1",
    workspaceId: workspace.id,
    runId: "run_1",
    toolCallId: "tool_1",
    title: "Assign ticket #102 to Platform On-call",
    summary: "Proposed because the SSO guide says repeated failures should escalate within 30 minutes.",
    status: "pending",
    requestedBy: "OpsPilot",
    decidedBy: null,
    createdAt: "2026-03-16T08:11:03.000Z",
    decidedAt: null,
  },
];

const evalCases: EvalCase[] = [
  {
    id: "eval_case_1",
    workspaceId: workspace.id,
    title: "Refund policy lookup",
    prompt: "Can we refund a first monthly charge after 10 days?",
    expected: ["14 days", "first successful charge"],
    requiresCitation: true,
  },
  {
    id: "eval_case_2",
    workspaceId: workspace.id,
    title: "SSO escalation rule",
    prompt: "When should an SSO failure cluster be escalated?",
    expected: ["three", "30 minute", "on-call"],
    requiresCitation: true,
  },
  {
    id: "eval_case_3",
    workspaceId: workspace.id,
    title: "Incident communications cadence",
    prompt: "How often should we publish external updates during an incident?",
    expected: ["30 minutes", "status page"],
    requiresCitation: true,
  },
];

const evalRuns: EvalRun[] = [
  {
    id: "eval_run_1",
    workspaceId: workspace.id,
    caseId: "eval_case_1",
    status: "completed",
    score: 0.91,
    notes: "Returned the correct refund window and cited the billing handbook.",
    output: "Monthly plans are refundable within 14 days of the first successful charge.",
    createdAt: "2026-03-16T10:00:00.000Z",
    completedAt: "2026-03-16T10:00:04.000Z",
  },
];

const auditLogs: AuditLog[] = [
  {
    id: "audit_1",
    workspaceId: workspace.id,
    actor: "OpsPilot",
    event: "approval_requested",
    target: "ticket_102",
    detail: "Requested approval to assign ticket #102 to Platform On-call.",
    createdAt: "2026-03-16T08:11:03.000Z",
  },
  {
    id: "audit_2",
    workspaceId: workspace.id,
    actor: "Mina Patel",
    event: "ticket_comment_added",
    target: "ticket_101",
    detail: "Logged duplicate invoice confirmation details.",
    createdAt: "2026-03-16T09:10:00.000Z",
  },
];

export function createDemoSnapshot(): WorkspaceSnapshot {
  const documentChunks = documents.flatMap((document) =>
    buildDocumentChunks(document.title, document.workspaceId, document.id, document.rawText),
  );

  return {
    workspace,
    members,
    providerSettings,
    documents: documents.map((document) => ({
      ...document,
      chunkCount: documentChunks.filter((chunk) => chunk.documentId === document.id).length,
    })),
    documentChunks,
    tickets,
    ticketComments,
    conversations,
    messages,
    agentRuns,
    toolCalls,
    approvals,
    evalCases,
    evalRuns,
    auditLogs,
  };
}
