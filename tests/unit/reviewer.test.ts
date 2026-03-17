import { buildConversationTitle, buildDemoReviewResponse, isReviewRequest } from "@/lib/services/reviewer";
import type { Citation, DocumentRecord } from "@/lib/types";

function createDocument(overrides: Partial<DocumentRecord>): DocumentRecord {
  return {
    id: "doc_1",
    workspaceId: "ws_1",
    title: "review-api.ts",
    format: "txt",
    summary: "demo summary",
    status: "indexed",
    sourcePath: "app/api/review-api.ts",
    rawText: 'const token = "sk-demo-secret-123456";\nconsole.log(token);\n',
    chunkCount: 1,
    createdAt: "2026-03-17T00:00:00.000Z",
    updatedAt: "2026-03-17T00:00:00.000Z",
    ...overrides,
  };
}

describe("reviewer helpers", () => {
  it("detects review requests from file context", () => {
    expect(isReviewRequest("take a look", ["doc_1"])).toBe(true);
    expect(isReviewRequest("what does this refund policy say")).toBe(false);
  });

  it("builds a file-based thread title for reviews", () => {
    const document = createDocument({});
    expect(buildConversationTitle("Review these changes", [document])).toBe("Review app/api/review-api.ts");
  });

  it("surfaces findings first for risky code", () => {
    const document = createDocument({});
    const citations: Citation[] = [
      {
        id: "citation_1",
        sourceType: "document",
        sourceId: document.id,
        label: document.sourcePath!,
        excerpt: 'const token = "sk-demo-secret-123456";',
        score: 0.9,
      },
    ];

    const response = buildDemoReviewResponse({
      message: "Review this file",
      documents: [document],
      citations,
    });

    expect(response).toContain("Findings");
    expect(response).toContain("HIGH - `app/api/review-api.ts:1` Hardcoded credential-like value.");
    expect(response).toContain("LOW - `app/api/review-api.ts:2` Debug logging in runtime path.");
  });
});
