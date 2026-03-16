import { ProviderSettingsForm } from "@/components/providers/provider-settings-form";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { getProviderSettings } from "@/lib/data/repository";

import { saveProviderSettingsAction } from "./actions";

export default async function ProviderSettingsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const settings = await getProviderSettings(slug);

  if (!settings) {
    return null;
  }

  return (
    <main className="space-y-6">
      <SectionCard>
        <PageHeader
          eyebrow="Model access"
          title="Provider settings"
          description="Store provider configuration per workspace so you can switch between demo mode, local Ollama, and cloud inference without changing code."
        />
      </SectionCard>

      <SectionCard>
        <ProviderSettingsForm settings={settings} action={saveProviderSettingsAction.bind(null, slug)} />
        <div className="mt-6 rounded-[1.5rem] border border-dashed border-[var(--line)] bg-[var(--card-strong)] p-5">
          <p className="text-sm font-semibold">Recommended local setup</p>
          <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
            Install Ollama, pull a chat model and an embedding model, then point this page to
            <code className="mx-1 rounded bg-[rgba(16,32,48,0.06)] px-1 py-0.5">http://127.0.0.1:11434/v1</code>
            for free local development.
          </p>
        </div>
      </SectionCard>
    </main>
  );
}
