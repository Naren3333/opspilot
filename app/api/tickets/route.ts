import { z } from "zod";

import { createManualTicket, listTickets } from "@/lib/data/repository";

const createTicketSchema = z.object({
  workspaceSlug: z.string().min(1),
  subject: z.string().min(3),
  summary: z.string().min(3),
  body: z.string().min(3),
  requester: z.string().email(),
  assignee: z.string().min(1),
  priority: z.enum(["low", "normal", "high", "urgent"]),
  tags: z.array(z.string()).default([]),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const workspaceSlug = searchParams.get("workspaceSlug");
  if (!workspaceSlug) {
    return Response.json({ error: "workspaceSlug is required." }, { status: 400 });
  }

  const tickets = await listTickets(workspaceSlug);
  return Response.json({ tickets });
}

export async function POST(request: Request) {
  try {
    const payload = createTicketSchema.parse(await request.json());
    const ticket = await createManualTicket(payload);
    return Response.json({ ticket }, { status: 201 });
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Failed to create ticket.",
      },
      { status: 400 },
    );
  }
}
