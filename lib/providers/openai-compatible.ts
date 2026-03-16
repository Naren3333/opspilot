import OpenAI from "openai";

import type { ModelProvider, ProviderHealth, ProviderMessage } from "@/lib/providers/types";

interface OpenAICompatibleConfig {
  name: string;
  apiKey: string;
  baseURL: string;
  chatModel: string;
  embeddingModel: string;
}

export class OpenAICompatibleProvider implements ModelProvider {
  readonly name: string;
  readonly chatModel: string;
  readonly embeddingModel: string;
  private readonly client: OpenAI;

  constructor(config: OpenAICompatibleConfig) {
    this.name = config.name;
    this.chatModel = config.chatModel;
    this.embeddingModel = config.embeddingModel;
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
    });
  }

  async *streamChat(messages: ProviderMessage[]) {
    const stream = await this.client.chat.completions.create({
      model: this.chatModel,
      messages,
      temperature: 0.2,
      stream: true,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) {
        yield delta;
      }
    }
  }

  async completeChat(messages: ProviderMessage[]) {
    const completion = await this.client.chat.completions.create({
      model: this.chatModel,
      messages,
      temperature: 0.2,
    });

    return completion.choices[0]?.message?.content ?? "";
  }

  async embedText(input: string[]) {
    const embeddings = await this.client.embeddings.create({
      model: this.embeddingModel,
      input,
    });

    return embeddings.data.map((item) => item.embedding);
  }

  async healthCheck(): Promise<ProviderHealth> {
    const startedAt = Date.now();
    try {
      await this.completeChat([
        { role: "system", content: "Reply with only the word healthy." },
        { role: "user", content: "health-check" },
      ]);

      return {
        ok: true,
        provider: this.name,
        model: this.chatModel,
        latencyMs: Date.now() - startedAt,
      };
    } catch (error) {
      return {
        ok: false,
        provider: this.name,
        model: this.chatModel,
        latencyMs: Date.now() - startedAt,
        error: error instanceof Error ? error.message : "Unknown provider error",
      };
    }
  }
}
