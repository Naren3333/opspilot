import { clamp } from "@/lib/utils";

export interface ChunkedText {
  content: string;
  tokenCount: number;
}

export function estimateTokenCount(value: string) {
  return Math.ceil(value.trim().split(/\s+/).filter(Boolean).length * 1.25);
}

export function chunkText(input: string, maxWords = 140) {
  const words = input.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  if (!words.length) {
    return [];
  }

  const chunks: ChunkedText[] = [];
  const effectiveSize = clamp(maxWords, 80, 220);

  for (let index = 0; index < words.length; index += effectiveSize) {
    const content = words.slice(index, index + effectiveSize).join(" ").trim();
    if (!content) continue;
    chunks.push({
      content,
      tokenCount: estimateTokenCount(content),
    });
  }

  return chunks;
}
