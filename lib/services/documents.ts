import { PDFParse } from "pdf-parse";

import { chunkText } from "@/lib/services/chunking";

export async function extractTextFromFile(name: string, buffer: Buffer) {
  if (name.toLowerCase().endsWith(".pdf")) {
    const parser = new PDFParse({ data: buffer });
    const parsed = await parser.getText();
    await parser.destroy();
    return parsed.text.trim();
  }

  return buffer.toString("utf8").trim();
}

export function summarizeText(text: string) {
  return text
    .split(/(?<=[.!?])\s+/)
    .slice(0, 2)
    .join(" ")
    .trim();
}

export function buildDocumentChunks(title: string, workspaceId: string, documentId: string, text: string) {
  return chunkText(text).map((chunk, index) => ({
    id: `${documentId}_chunk_${index + 1}`,
    workspaceId,
    documentId,
    title,
    content: chunk.content,
    tokenCount: chunk.tokenCount,
  }));
}
