import type { ToolActionType } from "@/lib/types";

const mutatingActions = new Set<ToolActionType>([
  "draftReply",
  "createTicket",
  "updateTicketPriority",
  "assignTicket",
]);

export function requiresApproval(action: ToolActionType) {
  return mutatingActions.has(action);
}
