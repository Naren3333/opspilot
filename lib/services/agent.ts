import { getCurrentUserEmail } from "@/lib/auth";
import {
  appendMessage,
  createAgentRun,
  createApprovalsForRun,
  createConversation,
  getConversationById,
  getConversationMessages,
  getDocumentsByIds,
  getProviderSettings,
  getWorkspaceSnapshot,
  listTickets,
  searchKnowledgeBase,
  updateConversationContext,
  updateAgentRun,
} from "@/lib/data/repository";
import { getModelProvider } from "@/lib/providers";
import type { ProviderMessage } from "@/lib/providers/types";
import { OPSPILOT_PROMPT_VERSION, buildSystemPrompt } from "@/lib/prompts";
import {
  buildConversationTitle,
  buildDemoReviewResponse,
  isReviewRequest,
} from "@/lib/services/reviewer";
import type { ChatRequest, Citation, ToolActionProposal } from "@/lib/types";

function buildContext(citations: Citation[], mode: "support" | "review") {
  if (!citations.length) {
    return mode === "review"
      ? "Review context: No direct file excerpts were retrieved. Ask for more files or narrow the review target."
      : "Context: No direct matches were retrieved. Answer carefully and say when more documentation is needed.";
  }

  const heading = mode === "review" ? "Review context:" : "Context:";
  return [
    heading,
    ...citations.map(
      (citation, index) =>
        `${index + 1}. [${citation.label}] ${citation.excerpt} (score ${citation.score.toFixed(2)})`,
    ),
  ].join("\n");
}

function inferTicketId(message: string, tickets: Awaited<ReturnType<typeof listTickets>>) {
  const ticketNumberMatch = message.match(/#(\d+)/);
  if (ticketNumberMatch) {
    const byNumber = tickets.find((ticket) => ticket.number === Number(ticketNumberMatch[1]));
    if (byNumber) return byNumber.id;
  }

  if (/sso|login|identity/i.test(message)) {
    return tickets.find((ticket) => /sso|login/i.test(ticket.subject))?.id ?? tickets[0]?.id;
  }

  if (/refund|invoice|billing/i.test(message)) {
    return tickets.find((ticket) => /refund|invoice|billing/i.test(ticket.subject))?.id ?? tickets[0]?.id;
  }

  return tickets[0]?.id;
}

async function inferToolProposals(workspaceSlug: string, runId: string, message: string): Promise<ToolActionProposal[]> {
  const snapshot = await getWorkspaceSnapshot(workspaceSlug);
  const tickets = await listTickets(workspaceSlug);
  if (!snapshot) return [];

  const ticketId = inferTicketId(message, tickets);
  const proposals: ToolActionProposal[] = [];

  if (/draft|reply|respond/i.test(message) && ticketId) {
    proposals.push({
      id: `${runId}_draft`,
      workspaceId: snapshot.workspace.id,
      runId,
      action: "draftReply",
      reason: "The request asks for a drafted response that should be reviewed before saving.",
      payload: {
        ticketId,
        reply: "Draft a calm, evidence-based reply that cites the relevant policy before sending.",
      },
    });
  }

  if (/assign|escalate|owner/i.test(message) && ticketId) {
    proposals.push({
      id: `${runId}_assign`,
      workspaceId: snapshot.workspace.id,
      runId,
      action: "assignTicket",
      reason: "The user requested ownership changes or escalation.",
      payload: {
        ticketId,
        assignee: /sso|incident/i.test(message) ? "Platform On-call" : "Billing Specialist",
      },
    });
  }

  if (/priority|urgent|severity/i.test(message) && ticketId) {
    proposals.push({
      id: `${runId}_priority`,
      workspaceId: snapshot.workspace.id,
      runId,
      action: "updateTicketPriority",
      reason: "The request asks for a priority update based on retrieved support context.",
      payload: {
        ticketId,
        priority: /urgent|sev1|critical/i.test(message) ? "urgent" : "high",
      },
    });
  }

  if (/create ticket|open ticket|new ticket/i.test(message)) {
    proposals.push({
      id: `${runId}_create`,
      workspaceId: snapshot.workspace.id,
      runId,
      action: "createTicket",
      reason: "The user explicitly asked to create a new ticket, which should always require approval.",
      payload: {
        subject: "Follow-up created from OpsPilot",
        summary: message.slice(0, 140),
        body: message,
        requester: await getCurrentUserEmail(),
        assignee: "Unassigned",
        priority: "normal",
        tags: ["ai-created", "follow-up"],
      },
    });
  }

  return proposals;
}

function buildFallbackResponse(input: {
  message: string;
  citations: Citation[];
  mode: "support" | "review";
}) {
  if (input.mode === "review") {
    const evidence = input.citations[0]?.excerpt
      ? `Most relevant snippet: ${input.citations[0].excerpt}`
      : "No matching file excerpt was retrieved.";
    return `I prepared a review-oriented fallback for "${input.message}". ${evidence}`;
  }

  const evidence = input.citations[0]?.excerpt
    ? `Most relevant evidence: ${input.citations[0].excerpt}`
    : "No strong evidence was found in the workspace yet.";

  return `Here is a grounded summary for "${input.message}": ${evidence}`;
}

export async function initializeChatRun(request: ChatRequest) {
  const snapshot = await getWorkspaceSnapshot(request.workspaceSlug);
  if (!snapshot) {
    throw new Error("Workspace not found.");
  }

  const existingConversation = request.conversationId ? await getConversationById(request.conversationId) : null;
  const resolvedDocumentIds = request.documentIds ?? existingConversation?.contextDocumentIds ?? [];
  const selectedDocuments = await getDocumentsByIds(request.workspaceSlug, resolvedDocumentIds);
  const mode = isReviewRequest(request.message, resolvedDocumentIds) ? "review" : "support";
  const conversation =
    existingConversation ??
    (await createConversation(request.workspaceSlug, buildConversationTitle(request.message, selectedDocuments), {
      contextDocumentIds: resolvedDocumentIds,
    }));

  if (existingConversation) {
    await updateConversationContext(existingConversation.id, resolvedDocumentIds);
  }

  await appendMessage({
    conversationId: conversation.id,
    workspaceId: snapshot.workspace.id,
    role: "user",
    content: request.message,
  });

  const citations = (
    await searchKnowledgeBase(request.workspaceSlug, request.message, {
      documentIds: resolvedDocumentIds,
    })
  ).map((item) => item.citation);

  const settings = await getProviderSettings(request.workspaceSlug);
  const provider = getModelProvider(settings);
  const priorMessages = await getConversationMessages(conversation.id);
  const providerMessages: ProviderMessage[] = [
    {
      role: "system",
      content: `${buildSystemPrompt(mode)}\n${buildContext(citations, mode)}`,
    },
    ...priorMessages.slice(-6).map((message) => ({
      role: message.role,
      content: message.content,
    })),
  ];

  const run = await createAgentRun({
    workspaceId: snapshot.workspace.id,
    conversationId: conversation.id,
    promptVersion: OPSPILOT_PROMPT_VERSION,
    status: "running",
    provider: provider.name,
    model: provider.chatModel,
    latencyMs: 0,
    prompt: request.message,
    response: "",
    citations,
    toolActions: [],
  });

  const demoResponse =
    mode === "review"
      ? buildDemoReviewResponse({
          message: request.message,
          documents: selectedDocuments,
          citations,
        })
      : null;

  return {
    workspace: snapshot.workspace,
    conversation,
    run,
    citations,
    provider,
    providerMessages,
    fallbackText: buildFallbackResponse({
      message: request.message,
      citations,
      mode,
    }),
    demoResponse,
  };
}

export async function finalizeChatRun(input: {
  workspaceSlug: string;
  conversationId: string;
  runId: string;
  response: string;
  citations: Citation[];
  latencyMs: number;
  userMessage: string;
}) {
  const snapshot = await getWorkspaceSnapshot(input.workspaceSlug);
  if (!snapshot) {
    throw new Error("Workspace not found.");
  }

  const proposals = await inferToolProposals(input.workspaceSlug, input.runId, input.userMessage);
  const approvals = proposals.length
    ? await createApprovalsForRun(input.workspaceSlug, input.runId, proposals)
    : [];

  await appendMessage({
    conversationId: input.conversationId,
    workspaceId: snapshot.workspace.id,
    role: "assistant",
    content: input.response,
    citations: input.citations,
  });

  const run = await updateAgentRun(input.runId, {
    status: approvals.length ? "awaiting_approval" : "completed",
    latencyMs: input.latencyMs,
    response: input.response,
    citations: input.citations,
    toolActions: proposals,
  });

  return {
    run,
    approvals,
    proposals,
  };
}
