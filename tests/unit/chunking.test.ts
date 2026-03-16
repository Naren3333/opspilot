import { chunkText, estimateTokenCount } from "@/lib/services/chunking";

describe("chunkText", () => {
  it("splits long text into bounded chunks", () => {
    const text = Array.from({ length: 260 }, (_, index) => `word-${index}`).join(" ");
    const chunks = chunkText(text, 100);

    expect(chunks.length).toBeGreaterThan(2);
    expect(chunks.every((chunk) => chunk.content.length > 0)).toBe(true);
  });

  it("estimates token count above zero for normal sentences", () => {
    expect(estimateTokenCount("hello support team")).toBeGreaterThan(0);
  });
});
