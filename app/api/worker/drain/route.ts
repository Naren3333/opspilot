import { z } from "zod";

import { env } from "@/lib/env";
import { drainQueuedDocuments } from "@/lib/data/repository";

const schema = z.object({
  workspaceSlug: z.string().min(1),
});

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader && authHeader !== `Bearer ${env.cronSecret}`) {
    return Response.json({ error: "Invalid worker secret." }, { status: 401 });
  }

  try {
    const payload = schema.parse(await request.json());
    const documents = await drainQueuedDocuments(payload.workspaceSlug);
    return Response.json({ documents });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to drain worker queue." },
      { status: 400 },
    );
  }
}
