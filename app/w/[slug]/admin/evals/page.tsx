import { EvalRunner } from "@/components/evals/eval-runner";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { StatusBadge } from "@/components/status-badge";
import { listEvalCases, listEvalRuns } from "@/lib/data/repository";

export default async function EvalsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const cases = await listEvalCases(slug);
  const runs = await listEvalRuns(slug);

  return (
    <main className="space-y-6">
      <SectionCard>
        <PageHeader
          eyebrow="Quality"
          title="Evaluations"
          description="Trigger retrieval-heavy eval cases and review whether the answer contained expected policy language and support evidence."
        />
      </SectionCard>

      <div className="grid gap-5 xl:grid-cols-[1.2fr_1fr]">
        <SectionCard>
          <h2 className="text-xl font-semibold">Eval cases</h2>
          <div className="mt-5 space-y-4">
            {cases.map((item) => (
              <div key={item.id} className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--card-strong)] p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-sm font-semibold">{item.title}</p>
                    <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{item.prompt}</p>
                  </div>
                  <EvalRunner workspaceSlug={slug} caseId={item.id} />
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard>
          <h2 className="text-xl font-semibold">Recent runs</h2>
          <div className="mt-5 space-y-4">
            {runs.map((run) => (
              <div key={run.id} className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--card-strong)] p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold">{run.caseId}</p>
                  <StatusBadge value={run.status} />
                </div>
                <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{run.output || run.notes}</p>
                <p className="mt-3 text-sm font-semibold">
                  Score: {run.score !== null ? `${Math.round(run.score * 100)}%` : "Pending"}
                </p>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </main>
  );
}
