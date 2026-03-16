import { ApprovalActions } from "@/components/approvals/approval-actions";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { StatusBadge } from "@/components/status-badge";
import { listApprovals } from "@/lib/data/repository";
import { formatDate } from "@/lib/utils";

export default async function ApprovalsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const approvals = await listApprovals(slug);

  return (
    <main className="space-y-6">
      <SectionCard>
        <PageHeader
          eyebrow="Safety layer"
          title="Approvals"
          description="Every mutating tool call pauses here. Owners and admins can inspect intent before ticket state changes are executed."
        />
      </SectionCard>

      <div className="space-y-4">
        {approvals.map((approval) => (
          <SectionCard key={approval.id}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-lg font-semibold">{approval.title}</p>
                  <StatusBadge value={approval.status} />
                </div>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--muted)]">{approval.summary}</p>
                <p className="mt-3 text-sm text-[var(--muted)]">Requested {formatDate(approval.createdAt)}</p>
              </div>
              {approval.status === "pending" ? <ApprovalActions approvalId={approval.id} /> : null}
            </div>
          </SectionCard>
        ))}
      </div>
    </main>
  );
}
