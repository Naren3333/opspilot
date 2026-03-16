import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { StatusBadge } from "@/components/status-badge";
import { listAgentRuns } from "@/lib/data/repository";
import { formatDate } from "@/lib/utils";

export default async function TracesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const runs = await listAgentRuns(slug);

  return (
    <main className="space-y-6">
      <SectionCard>
        <PageHeader
          eyebrow="Observability"
          title="Agent traces"
          description="Inspect prompts, citations, latency, and pending tool actions to understand how each response was assembled."
        />
      </SectionCard>

      <div className="space-y-4">
        {runs.map((run) => (
          <SectionCard key={run.id}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-lg font-semibold">{run.prompt}</p>
                  <StatusBadge value={run.status} />
                </div>
                <p className="mt-3 text-sm leading-7 text-[var(--muted)]">{run.response}</p>
                <p className="mt-3 text-sm text-[var(--muted)]">
                  {run.provider} · {run.model} · {run.latencyMs} ms · {formatDate(run.createdAt)}
                </p>
              </div>
              <div className="w-full max-w-md rounded-[1.5rem] border border-[var(--line)] bg-[var(--card-strong)] p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">Citations</p>
                <div className="mt-3 space-y-3">
                  {run.citations.map((citation) => (
                    <div key={citation.id}>
                      <p className="text-sm font-semibold">{citation.label}</p>
                      <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{citation.excerpt}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </SectionCard>
        ))}
      </div>
    </main>
  );
}
