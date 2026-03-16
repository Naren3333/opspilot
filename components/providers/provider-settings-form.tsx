"use client";

import { useFormStatus } from "react-dom";

import type { ProviderSettings } from "@/lib/types";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
    >
      {pending ? "Saving..." : "Save provider settings"}
    </button>
  );
}

export function ProviderSettingsForm({
  settings,
  action,
}: {
  settings: ProviderSettings;
  action: (formData: FormData) => Promise<void>;
}) {
  return (
    <form action={action} className="grid gap-4 md:grid-cols-2">
      <div>
        <label className="text-sm font-medium">Provider</label>
        <select
          name="provider"
          defaultValue={settings.provider}
          className="mt-2 w-full rounded-2xl border border-[var(--line)] bg-[var(--background)] px-4 py-3"
        >
          <option value="mock">Mock / demo</option>
          <option value="ollama">Ollama</option>
          <option value="openai-compatible">OpenAI-compatible</option>
        </select>
      </div>
      <div>
        <label className="text-sm font-medium">Base URL</label>
        <input
          name="baseUrl"
          defaultValue={settings.baseUrl}
          className="mt-2 w-full rounded-2xl border border-[var(--line)] bg-[var(--background)] px-4 py-3"
        />
      </div>
      <div>
        <label className="text-sm font-medium">Chat model</label>
        <input
          name="chatModel"
          defaultValue={settings.chatModel}
          className="mt-2 w-full rounded-2xl border border-[var(--line)] bg-[var(--background)] px-4 py-3"
        />
      </div>
      <div>
        <label className="text-sm font-medium">Embedding model</label>
        <input
          name="embeddingModel"
          defaultValue={settings.embeddingModel}
          className="mt-2 w-full rounded-2xl border border-[var(--line)] bg-[var(--background)] px-4 py-3"
        />
      </div>
      <div className="md:col-span-2">
        <label className="text-sm font-medium">API key</label>
        <input
          name="apiKey"
          type="password"
          placeholder={settings.hasApiKey ? "Stored securely. Enter to replace." : "Optional in demo mode"}
          className="mt-2 w-full rounded-2xl border border-[var(--line)] bg-[var(--background)] px-4 py-3"
        />
      </div>
      <div className="md:col-span-2">
        <SubmitButton />
      </div>
    </form>
  );
}
