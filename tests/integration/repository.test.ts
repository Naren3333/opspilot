import {
  createApprovalsForRun,
  createConversation,
  decideApproval,
  drainQueuedDocuments,
  getConversationById,
  searchKnowledgeBase,
  getWorkspaceSnapshot,
  queueDocument,
  updateConversationContext,
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

  it("keeps review retrieval scoped to the selected uploaded files", async () => {
    const document = await queueDocument({
      workspaceSlug: "northstar-support",
      title: "auth-review.ts",
      format: "txt",
      rawText: 'const token = "sk-demo-123456789";\nconsole.log(token);\n',
      sourcePath: "auth-review.ts",
    });

    await drainQueuedDocuments("northstar-support");

    const hits = await searchKnowledgeBase("northstar-support", "review these files", {
      documentIds: [document.id],
    });

    expect(hits.length).toBeGreaterThan(0);
    expect(hits.every((hit) => hit.citation.sourceType === "document")).toBe(true);
    expect(hits.some((hit) => hit.citation.sourceId === document.id)).toBe(true);
  });

  it("stores file context per conversation", async () => {
    const conversation = await createConversation("northstar-support", "Context memory", {
      contextDocumentIds: ["doc_review_api"],
    });

    await updateConversationContext(conversation.id, ["doc_review_panel", "doc_status"]);
    const updatedConversation = await getConversationById(conversation.id);

    expect(updatedConversation?.contextDocumentIds).toEqual(["doc_review_panel", "doc_status"]);
  });
});
