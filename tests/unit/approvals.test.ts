import { requiresApproval } from "@/lib/services/approvals";

describe("requiresApproval", () => {
  it("flags mutating actions", () => {
    expect(requiresApproval("assignTicket")).toBe(true);
    expect(requiresApproval("draftReply")).toBe(true);
  });

  it("ignores read-only actions", () => {
    expect(requiresApproval("searchDocs")).toBe(false);
    expect(requiresApproval("searchTickets")).toBe(false);
  });
});
