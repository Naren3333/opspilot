import { notFound } from "next/navigation";

import { ChatClient } from "@/components/chat/chat-client";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { StatCard } from "@/components/stat-card";
import {
  getConversationMessages,
  getWorkspaceSnapshot,
  listConversations,
  listDocuments,
} from "@/lib/data/repository";

export default async function ChatPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ conversation?: string }>;
}) {
  const { slug } = await params;
  const { conversation: requestedConversationId } = await searchParams;
  const snapshot = await getWorkspaceSnapshot(slug);
  if (!snapshot) notFound();

  const conversations = await listConversations(slug);
  const documents = await listDocuments(slug);
  const activeConversation =
    conversations.find((item) => item.id === requestedConversationId) ?? conversations[0] ?? null;
  const messages = activeConversation ? await getConversationMessages(activeConversation.id) : [];
  const pendingApprovals = snapshot.approvals.filter((item) => item.status === "pending").length;
  const indexedReviewFiles = documents.filter((document) => document.status === "indexed").length;

  return (
    <main className="space-y-6">
      <SectionCard>
        <PageHeader
          eyebrow="Review console"
          title="Codex-style file review"
          description="Upload code or config files, keep each review in its own thread, and let the agent surface bugs, regressions, and missing tests with attached evidence."
        />
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <StatCard
            label="Threads"
            value={String(conversations.length)}
            hint={
              activeConversation
                ? `${messages.length} messages loaded into ${activeConversation.title}`
                : "Start a new review thread to open a fresh chat history"
            }
          />
          <StatCard
            label="Indexed files"
            value={String(indexedReviewFiles)}
            hint="Any uploaded file can be pinned as review context for the current thread"
          />
          <StatCard
            label="Provider"
            value={snapshot.providerSettings.provider}
            hint={`${snapshot.providerSettings.chatModel} is the active reviewer model`}
          />
        </div>
      </SectionCard>

      <ChatClient
        workspaceSlug={slug}
        initialConversationId={activeConversation?.id ?? null}
        initialConversationTitle={activeConversation?.title ?? null}
        initialConversations={conversations}
        initialDocuments={documents}
        initialMessages={messages}
        pendingApprovalCount={pendingApprovals}
      />
    </main>
  );
}
