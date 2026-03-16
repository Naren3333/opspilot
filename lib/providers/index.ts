import { env } from "@/lib/env";
import { decryptString } from "@/lib/crypto";
import { MockProvider } from "@/lib/providers/mock";
import { OpenAICompatibleProvider } from "@/lib/providers/openai-compatible";
import type { ModelProvider } from "@/lib/providers/types";
import type { ProviderSettings } from "@/lib/types";

export function getModelProvider(settings?: ProviderSettings | null): ModelProvider {
  if (settings?.provider === "openai-compatible" && settings.baseUrl && settings.chatModel) {
    return new OpenAICompatibleProvider({
      name: "workspace-provider",
      apiKey: settings.apiKey ? decryptString(settings.apiKey) : env.openAiApiKey ?? "",
      baseURL: settings.baseUrl,
      chatModel: settings.chatModel,
      embeddingModel: settings.embeddingModel,
    });
  }

  if (settings?.provider === "ollama") {
    return new OpenAICompatibleProvider({
      name: "ollama",
      apiKey: settings.apiKey ? decryptString(settings.apiKey) : "ollama",
      baseURL: settings.baseUrl || env.ollamaBaseUrl,
      chatModel: settings.chatModel || env.ollamaChatModel,
      embeddingModel: settings.embeddingModel || env.ollamaEmbeddingModel,
    });
  }

  if (env.isCloudProviderConfigured) {
    return new OpenAICompatibleProvider({
      name: "openai-compatible",
      apiKey: env.openAiApiKey ?? "",
      baseURL: env.openAiBaseUrl,
      chatModel: env.openAiChatModel,
      embeddingModel: env.openAiEmbeddingModel,
    });
  }

  return new MockProvider();
}
