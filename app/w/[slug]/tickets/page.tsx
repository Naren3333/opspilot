import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { StatusBadge } from "@/components/status-badge";
import { listTickets } from "@/lib/data/repository";
import { formatRelativeTime } from "@/lib/utils";

export default async function TicketsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tickets = await listTickets(slug);

  return (
    <main className="space-y-6">
      <SectionCard>
        <PageHeader
          eyebrow="Queue"
          title="Ticket inbox"
          description="A seeded support queue with priorities, assignees, and enough context to show retrieval and approval flows."
        />
      </SectionCard>

      <SectionCard className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[var(--card-strong)] text-[var(--muted)]">
              <tr>
                <th className="px-5 py-4 font-medium">Ticket</th>
                <th className="px-5 py-4 font-medium">Status</th>
                <th className="px-5 py-4 font-medium">Priority</th>
                <th className="px-5 py-4 font-medium">Assignee</th>
                <th className="px-5 py-4 font-medium">Updated</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((ticket) => (
                <tr key={ticket.id} className="border-t border-[var(--line)]">
                  <td className="px-5 py-4">
                    <Link href={`/w/${slug}/tickets/${ticket.id}`} className="font-semibold hover:text-[var(--accent)]">
                      #{ticket.number} {ticket.subject}
                    </Link>
                    <p className="mt-1 max-w-xl text-[var(--muted)]">{ticket.summary}</p>
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge value={ticket.status} />
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge value={ticket.priority} />
                  </td>
                  <td className="px-5 py-4">{ticket.assignee}</td>
                  <td className="px-5 py-4 text-[var(--muted)]">{formatRelativeTime(ticket.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </main>
  );
}
