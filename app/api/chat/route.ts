import { z } from "zod";

import { finalizeChatRun, initializeChatRun } from "@/lib/services/agent";

export const runtime = "nodejs";

const requestSchema = z.object({
  workspaceSlug: z.string().min(1),
  conversationId: z.string().optional(),
  message: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const payload = requestSchema.parse(await request.json());
    const start = Date.now();
    const setup = await initializeChatRun(payload);
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        let responseText = "";

        try {
          for await (const chunk of setup.provider.streamChat(setup.providerMessages)) {
            responseText += chunk;
            controller.enqueue(encoder.encode(`${JSON.stringify({ type: "chunk", content: chunk })}\n`));
          }
        } catch {
          responseText = setup.fallbackText;
          controller.enqueue(
            encoder.encode(`${JSON.stringify({ type: "chunk", content: setup.fallbackText })}\n`),
          );
        }

        const finalized = await finalizeChatRun({
          workspaceSlug: payload.workspaceSlug,
          conversationId: setup.conversation.id,
          runId: setup.run.id,
          response: responseText.trim() || setup.fallbackText,
          citations: setup.citations,
          latencyMs: Date.now() - start,
          userMessage: payload.message,
        });

        controller.enqueue(
          encoder.encode(
            `${JSON.stringify({
              type: "meta",
              citations: finalized.run?.citations ?? setup.citations,
              approvals: finalized.approvals,
              toolActions: finalized.proposals,
            })}\n`,
          ),
        );
        controller.enqueue(encoder.encode(`${JSON.stringify({ type: "done" })}\n`));
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Failed to start chat run.",
      },
      { status: 400 },
    );
  }
}
