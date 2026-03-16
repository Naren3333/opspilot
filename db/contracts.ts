export const WORKSPACE_TABLES = [
  "workspaces",
  "workspace_members",
  "workspace_secrets",
  "documents",
  "document_chunks",
  "tickets",
  "ticket_comments",
  "conversations",
  "messages",
  "agent_runs",
  "tool_calls",
  "approval_requests",
  "eval_cases",
  "eval_runs",
  "audit_logs",
] as const;

export const MUTATING_TOOL_ACTIONS = [
  "draftReply",
  "createTicket",
  "updateTicketPriority",
  "assignTicket",
] as const;
