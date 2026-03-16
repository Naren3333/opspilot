"use server";

import { revalidatePath } from "next/cache";

import { saveProviderSettings } from "@/lib/data/repository";
import type { ProviderSettings } from "@/lib/types";

export async function saveProviderSettingsAction(slug: string, formData: FormData) {
  const settings: ProviderSettings = {
    provider: String(formData.get("provider")) as ProviderSettings["provider"],
    baseUrl: String(formData.get("baseUrl") ?? ""),
    chatModel: String(formData.get("chatModel") ?? ""),
    embeddingModel: String(formData.get("embeddingModel") ?? ""),
    apiKey: String(formData.get("apiKey") ?? ""),
    hasApiKey: false,
    lastCheckedAt: null,
  };

  await saveProviderSettings(slug, settings);
  revalidatePath(`/w/${slug}/settings/providers`);
}
