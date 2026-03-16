import { z } from "zod";

import { getProviderSettings } from "@/lib/data/repository";
import { getTicketById, searchKnowledgeBase } from "@/lib/data/repository";
import { getModelProvider } from "@/lib/providers";
import { buildSystemPrompt } from "@/lib/prompts";

const schema = z.object({
  workspaceSlug: z.string().min(1),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  try {
    const payload = schema.parse(await request.json());
    const ticketData = await getTicketById(payload.workspaceSlug, id);
    if (!ticketData) {
      return Response.json({ error: "Ticket not found." }, { status: 404 });
    }

    const citations = (await searchKnowledgeBase(payload.workspaceSlug, ticketData.ticket.subject)).map(
      (item) => item.citation,
    );
    const settings = await getProviderSettings(payload.workspaceSlug);
    const provider = getModelProvider(settings);

    const draft = await provider.completeChat([
      {
        role: "system",
        content: `${buildSystemPrompt()}\nDraft a customer reply grounded in the context below.\n${citations
          .map((citation, index) => `${index + 1}. ${citation.label}: ${citation.excerpt}`)
          .join("\n")}`,
      },
      {
        role: "user",
        content: `Write a reply for ticket "${ticketData.ticket.subject}". Customer details: ${ticketData.ticket.body}`,
      },
    ]);

    return Response.json({ draft, citations });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to draft a reply." },
      { status: 400 },
    );
  }
}
