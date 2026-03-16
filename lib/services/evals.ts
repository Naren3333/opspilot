import {
  completeEvalRun,
  getProviderSettings,
  getWorkspaceSnapshot,
  queueEvalRun,
  searchKnowledgeBase,
} from "@/lib/data/repository";
import { getModelProvider } from "@/lib/providers";
import { buildSystemPrompt } from "@/lib/prompts";

function computeScore(expected: string[], output: string) {
  const lowered = output.toLowerCase();
  const hits = expected.filter((needle) => lowered.includes(needle.toLowerCase())).length;
  return hits / Math.max(expected.length, 1);
}

export async function runEvalForCase(workspaceSlug: string, caseId: string) {
  const snapshot = await getWorkspaceSnapshot(workspaceSlug);
  if (!snapshot) {
    throw new Error("Workspace not found.");
  }

  const evalCase = snapshot.evalCases.find((item) => item.id === caseId);
  if (!evalCase) {
    throw new Error("Evaluation case not found.");
  }

  const queued = await queueEvalRun(workspaceSlug, caseId);
  const citations = (await searchKnowledgeBase(workspaceSlug, evalCase.prompt)).map((hit) => hit.citation);
  const settings = await getProviderSettings(workspaceSlug);
  const provider = getModelProvider(settings);
  const output =
    (await provider.completeChat([
      {
        role: "system",
        content: `${buildSystemPrompt()}\nContext:\n${citations
          .map((citation, index) => `${index + 1}. ${citation.label}: ${citation.excerpt}`)
          .join("\n")}`,
      },
      {
        role: "user",
        content: evalCase.prompt,
      },
    ])) || "No answer generated.";

  const score = computeScore(evalCase.expected, output);
  const notes = score >= 0.75 ? "Passed expected phrase match threshold." : "Needs prompt or retrieval tuning.";
  return completeEvalRun(queued.id, output, score, notes);
}
