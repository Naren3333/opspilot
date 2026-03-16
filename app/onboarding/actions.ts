"use server";

import { redirect } from "next/navigation";

import { getCurrentUserEmail } from "@/lib/auth";
import { createWorkspace } from "@/lib/data/repository";

export async function createWorkspaceAction(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const industry = String(formData.get("industry") ?? "").trim();
  const userEmail = await getCurrentUserEmail();

  if (!name || !industry) {
    throw new Error("Workspace name and industry are required.");
  }

  const workspace = await createWorkspace({
    name,
    industry,
    ownerEmail: userEmail,
  });

  redirect(`/w/${workspace.slug}/chat`);
}
