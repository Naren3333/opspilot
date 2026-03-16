import { decideApproval } from "@/lib/data/repository";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const approval = await decideApproval(id, "rejected");
  if (!approval) {
    return Response.json({ error: "Approval not found." }, { status: 404 });
  }
  return Response.json({ approval });
}
