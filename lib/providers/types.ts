export interface ProviderMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ProviderHealth {
  ok: boolean;
  provider: string;
  model: string;
  latencyMs: number;
  error?: string;
}

export interface ModelProvider {
  readonly name: string;
  readonly chatModel: string;
  readonly embeddingModel: string;
  streamChat(messages: ProviderMessage[]): AsyncGenerator<string>;
  completeChat(messages: ProviderMessage[]): Promise<string>;
  embedText(input: string[]): Promise<number[][]>;
  healthCheck(): Promise<ProviderHealth>;
}
