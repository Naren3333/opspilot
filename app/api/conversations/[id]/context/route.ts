import { z } from "zod";

import { getConversationById, getWorkspaceSnapshot, updateConversationContext } from "@/lib/data/repository";

const requestSchema = z.object({
  workspaceSlug: z.string().min(1),
  documentIds: z.array(z.string()),
});

export async function PATCH(
  request: Request,
  context: {
    params: Promise<{ id: string }>;
  },
) {
  try {
    const payload = requestSchema.parse(await request.json());
    const { id } = await context.params;
    const conversation = await getConversationById(id);
    const snapshot = await getWorkspaceSnapshot(payload.workspaceSlug);

    if (!conversation || !snapshot || conversation.workspaceId !== snapshot.workspace.id) {
      return Response.json({ error: "Conversation not found." }, { status: 404 });
    }

    const updatedConversation = await updateConversationContext(id, payload.documentIds);
    return Response.json({ conversation: updatedConversation });
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Failed to update thread context.",
      },
      { status: 400 },
    );
  }
}
