import { z } from "zod";

import { runEvalForCase } from "@/lib/services/evals";

const schema = z.object({
  workspaceSlug: z.string().min(1),
  caseId: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const payload = schema.parse(await request.json());
    const result = await runEvalForCase(payload.workspaceSlug, payload.caseId);
    return Response.json({ result });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Eval failed." },
      { status: 400 },
    );
  }
}
