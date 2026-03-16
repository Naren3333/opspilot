import { notFound } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { StatusBadge } from "@/components/status-badge";
import { getTicketById } from "@/lib/data/repository";
import { formatDate } from "@/lib/utils";

export default async function TicketDetailPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;
  const ticketData = await getTicketById(slug, id);
  if (!ticketData) notFound();

  const { ticket, comments } = ticketData;

  return (
    <main className="space-y-6">
      <SectionCard>
        <PageHeader
          eyebrow={`Ticket #${ticket.number}`}
          title={ticket.subject}
          description={ticket.summary}
          actions={
            <div className="flex gap-3">
              <StatusBadge value={ticket.status} />
              <StatusBadge value={ticket.priority} />
            </div>
          }
        />
        <div className="mt-6 grid gap-5 md:grid-cols-3">
          <div className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--card-strong)] p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">Requester</p>
            <p className="mt-3 text-lg font-semibold">{ticket.requester}</p>
          </div>
          <div className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--card-strong)] p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">Assignee</p>
            <p className="mt-3 text-lg font-semibold">{ticket.assignee}</p>
          </div>
          <div className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--card-strong)] p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">Updated</p>
            <p className="mt-3 text-lg font-semibold">{formatDate(ticket.updatedAt)}</p>
          </div>
        </div>
      </SectionCard>

      <SectionCard>
        <h2 className="text-xl font-semibold">Customer context</h2>
        <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-[var(--muted)]">{ticket.body}</p>
        <div className="mt-5 flex flex-wrap gap-2">
          {ticket.tags.map((tag) => (
            <span key={tag} className="rounded-full bg-[var(--secondary-soft)] px-3 py-1 text-xs font-semibold text-[var(--secondary)]">
              {tag}
            </span>
          ))}
        </div>
      </SectionCard>

      <SectionCard>
        <h2 className="text-xl font-semibold">Activity</h2>
        <div className="mt-5 space-y-4">
          {comments.map((comment) => (
            <div key={comment.id} className="rounded-[1.25rem] border border-[var(--line)] bg-[var(--card-strong)] p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold">{comment.author}</p>
                <p className="text-sm text-[var(--muted)]">{formatDate(comment.createdAt)}</p>
              </div>
              <p className="mt-3 text-sm leading-7 text-[var(--muted)]">{comment.body}</p>
            </div>
          ))}
        </div>
      </SectionCard>
    </main>
  );
}
