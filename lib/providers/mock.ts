import type { ModelProvider, ProviderHealth, ProviderMessage } from "@/lib/providers/types";

function buildMockText(messages: ProviderMessage[]) {
  const latestUserMessage = [...messages].reverse().find((message) => message.role === "user")?.content ?? "";
  const context = messages
    .filter((message) => message.role === "system")
    .map((message) => message.content)
    .join(" ");

  return [
    "OpsPilot is in demo mode.",
    "I used the seeded support knowledge base to prepare a grounded reply.",
    latestUserMessage ? `Request summary: ${latestUserMessage.trim()}` : "",
    context.includes("Context:")
      ? "Citations are attached below so you can verify the answer before acting."
      : "Upload documents or connect a provider to enable richer answers.",
  ]
    .filter(Boolean)
    .join(" ");
}

function embedLexically(text: string) {
  const normalized = text.toLowerCase();
  const dimensions = Array.from({ length: 24 }, () => 0);
  for (let index = 0; index < normalized.length; index += 1) {
    dimensions[index % dimensions.length] += normalized.charCodeAt(index) / 255;
  }
  return dimensions.map((value) => Number(value.toFixed(4)));
}

export class MockProvider implements ModelProvider {
  readonly name = "mock";
  readonly chatModel = "demo-narrator";
  readonly embeddingModel = "lexical-hash";

  async *streamChat(messages: ProviderMessage[]) {
    const words = buildMockText(messages).split(" ");
    for (const word of words) {
      yield `${word} `;
    }
  }

  async completeChat(messages: ProviderMessage[]) {
    return buildMockText(messages);
  }

  async embedText(input: string[]) {
    return input.map(embedLexically);
  }

  async healthCheck(): Promise<ProviderHealth> {
    return {
      ok: true,
      provider: this.name,
      model: this.chatModel,
      latencyMs: 1,
    };
  }
}
