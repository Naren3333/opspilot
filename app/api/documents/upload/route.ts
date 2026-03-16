import { z } from "zod";

import { queueDocument } from "@/lib/data/repository";
import { extractTextFromFile } from "@/lib/services/documents";

export const runtime = "nodejs";

const inputSchema = z.object({
  workspaceSlug: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const fields = inputSchema.parse({
      workspaceSlug: formData.get("workspaceSlug"),
    });

    if (!(file instanceof File)) {
      return Response.json({ error: "A file upload is required." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const text = await extractTextFromFile(file.name, buffer);
    const extension = file.name.split(".").pop()?.toLowerCase();
    const format = extension === "pdf" ? "pdf" : extension === "md" ? "md" : "txt";

    const document = await queueDocument({
      workspaceSlug: fields.workspaceSlug,
      title: file.name.replace(/\.[^.]+$/, ""),
      format,
      rawText: text,
      sourcePath: file.name,
    });

    return Response.json({ document });
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Failed to upload document.",
      },
      { status: 400 },
    );
  }
}
