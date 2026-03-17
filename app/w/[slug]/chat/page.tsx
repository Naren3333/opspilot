import { notFound } from "next/navigation";

import { ChatClient } from "@/components/chat/chat-client";
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

  return (
    <main>
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
