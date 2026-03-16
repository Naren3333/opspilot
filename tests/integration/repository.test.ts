import {
  createApprovalsForRun,
  createConversation,
  decideApproval,
  drainQueuedDocuments,
  getWorkspaceSnapshot,
  queueDocument,
} from "@/lib/data/repository";
import { resetDemoStore } from "@/lib/data/demo-store";

describe("demo repository flows", () => {
  beforeEach(() => {
    resetDemoStore();
  });

  it("queues and indexes uploaded documents", async () => {
    await queueDocument({
      workspaceSlug: "northstar-support",
      title: "Escalation Notes",
      format: "txt",
      rawText: "Escalate enterprise login failures within thirty minutes.",
      sourcePath: "notes.txt",
    });

    const processed = await drainQueuedDocuments("northstar-support");
    const snapshot = await getWorkspaceSnapshot("northstar-support");

    expect(processed).toHaveLength(1);
    expect(snapshot?.documents.some((document) => document.title === "Escalation Notes")).toBe(true);
    expect(snapshot?.documentChunks.some((chunk) => chunk.title === "Escalation Notes")).toBe(true);
  });

  it("executes approved tool actions against the ticket store", async () => {
    const snapshot = await getWorkspaceSnapshot("northstar-support");
    const conversation = await createConversation("northstar-support", "Approval flow test");
    const runId = "run_test_approval";

    if (!snapshot) {
      throw new Error("Expected demo snapshot.");
    }

    const [approval] = await createApprovalsForRun("northstar-support", runId, [
      {
        id: "proposal_1",
        workspaceId: snapshot.workspace.id,
        runId,
        action: "assignTicket",
        reason: "Escalate the urgent SSO issue.",
        payload: {
          ticketId: "ticket_102",
          assignee: "Platform On-call",
        },
      },
    ]);

    expect(conversation.title).toBe("Approval flow test");

    await decideApproval(approval.id, "approved");
    const updatedSnapshot = await getWorkspaceSnapshot("northstar-support");

    expect(updatedSnapshot?.tickets.find((ticket) => ticket.id === "ticket_102")?.assignee).toBe(
      "Platform On-call",
    );
  });
});
