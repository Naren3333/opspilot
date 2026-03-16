import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
  OPS_ENCRYPTION_KEY: z.string().min(16).optional(),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_BASE_URL: z.string().url().default("https://api.openai.com/v1"),
  OPENAI_CHAT_MODEL: z.string().default("gpt-4.1-mini"),
  OPENAI_EMBEDDING_MODEL: z.string().default("text-embedding-3-small"),
  OLLAMA_BASE_URL: z.string().url().default("http://127.0.0.1:11434/v1"),
  OLLAMA_CHAT_MODEL: z.string().default("llama3.1"),
  OLLAMA_EMBEDDING_MODEL: z.string().default("nomic-embed-text"),
  CRON_SECRET: z.string().default("local-worker-secret"),
  NEXT_PUBLIC_DEMO_WORKSPACE_SLUG: z.string().default("northstar-support"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.warn("Environment variables are partially missing; OpsPilot will fall back to demo mode.");
}

const values = parsed.success ? parsed.data : envSchema.parse({});

export const env = {
  appUrl: values.NEXT_PUBLIC_APP_URL,
  supabaseUrl: values.NEXT_PUBLIC_SUPABASE_URL,
  supabaseAnonKey: values.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  encryptionKey: values.OPS_ENCRYPTION_KEY,
  openAiApiKey: values.OPENAI_API_KEY,
  openAiBaseUrl: values.OPENAI_BASE_URL,
  openAiChatModel: values.OPENAI_CHAT_MODEL,
  openAiEmbeddingModel: values.OPENAI_EMBEDDING_MODEL,
  ollamaBaseUrl: values.OLLAMA_BASE_URL,
  ollamaChatModel: values.OLLAMA_CHAT_MODEL,
  ollamaEmbeddingModel: values.OLLAMA_EMBEDDING_MODEL,
  cronSecret: values.CRON_SECRET,
  demoWorkspaceSlug: values.NEXT_PUBLIC_DEMO_WORKSPACE_SLUG,
  isSupabaseConfigured:
    Boolean(values.NEXT_PUBLIC_SUPABASE_URL) && Boolean(values.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  isCloudProviderConfigured: Boolean(values.OPENAI_API_KEY),
};

export function isSupabaseConfigured() {
  return env.isSupabaseConfigured;
}

export function isDemoMode() {
  return !env.isSupabaseConfigured;
}
