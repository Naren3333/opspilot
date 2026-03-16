import { notFound } from "next/navigation";

import { ChatClient } from "@/components/chat/chat-client";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { StatCard } from "@/components/stat-card";
import {
  createConversation,
  getConversationMessages,
  getWorkspaceSnapshot,
  listConversations,
} from "@/lib/data/repository";

export default async function ChatPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const snapshot = await getWorkspaceSnapshot(slug);
  if (!snapshot) notFound();

  const conversations = await listConversations(slug);
  const activeConversation = conversations[0] ?? (await createConversation(slug, "Queue planning"));
  const messages = await getConversationMessages(activeConversation.id);
  const pendingApprovals = snapshot.approvals.filter((item) => item.status === "pending").length;

  return (
    <main className="space-y-6">
      <SectionCard>
        <PageHeader
          eyebrow="Agent workspace"
          title="Support chat"
          description="Ask the copilot to analyze policies, cite tickets, draft replies, or propose changes that flow into approvals."
        />
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <StatCard
            label="Conversation"
            value={activeConversation.title}
            hint={`${messages.length} messages loaded into the current thread`}
          />
          <StatCard
            label="Pending approvals"
            value={String(pendingApprovals)}
            hint="Every mutating action from this assistant lands here first"
          />
          <StatCard
            label="Provider"
            value={snapshot.providerSettings.provider}
            hint={`${snapshot.providerSettings.chatModel} is the active chat model`}
          />
        </div>
      </SectionCard>

      <ChatClient
        workspaceSlug={slug}
        conversationId={activeConversation.id}
        initialMessages={messages}
      />
    </main>
  );
}
