import { DocumentUploadForm } from "@/components/documents/document-upload-form";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { StatusBadge } from "@/components/status-badge";
import { listDocuments } from "@/lib/data/repository";
import { formatDate } from "@/lib/utils";

export default async function DocumentsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const documents = await listDocuments(slug);

  return (
    <main className="space-y-6">
      <SectionCard>
        <PageHeader
          eyebrow="Knowledge base"
          title="Documents"
          description="Upload PDFs, markdown, or plain text. OpsPilot extracts text, chunks it, and pushes it into the retrieval layer."
        />
        <div className="mt-6">
          <DocumentUploadForm workspaceSlug={slug} />
        </div>
      </SectionCard>

      <div className="grid gap-5 md:grid-cols-2">
        {documents.map((document) => (
          <SectionCard key={document.id}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-lg font-semibold">{document.title}</p>
                <p className="mt-2 text-sm leading-7 text-[var(--muted)]">{document.summary}</p>
              </div>
              <StatusBadge value={document.status} />
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">Format</p>
                <p className="mt-2 text-sm font-semibold">{document.format.toUpperCase()}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">Chunks</p>
                <p className="mt-2 text-sm font-semibold">{document.chunkCount}</p>
              </div>
            </div>
            <p className="mt-4 text-sm text-[var(--muted)]">Updated {formatDate(document.updatedAt)}</p>
          </SectionCard>
        ))}
      </div>
    </main>
  );
}
