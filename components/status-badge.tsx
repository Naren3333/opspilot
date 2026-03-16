import { cn, sentenceCase } from "@/lib/utils";

const toneMap: Record<string, string> = {
  open: "bg-[rgba(200,95,45,0.12)] text-[var(--accent-ink)]",
  pending: "bg-[rgba(181,119,26,0.15)] text-[var(--warning)]",
  resolved: "bg-[rgba(45,132,92,0.14)] text-[var(--success)]",
  indexed: "bg-[rgba(45,132,92,0.14)] text-[var(--success)]",
  queued: "bg-[rgba(16,32,48,0.08)] text-[var(--foreground)]",
  indexing: "bg-[rgba(28,107,103,0.12)] text-[var(--secondary)]",
  failed: "bg-[rgba(167,65,51,0.14)] text-[var(--danger)]",
  approved: "bg-[rgba(45,132,92,0.14)] text-[var(--success)]",
  rejected: "bg-[rgba(167,65,51,0.14)] text-[var(--danger)]",
  expired: "bg-[rgba(16,32,48,0.08)] text-[var(--muted)]",
  running: "bg-[rgba(28,107,103,0.12)] text-[var(--secondary)]",
  completed: "bg-[rgba(45,132,92,0.14)] text-[var(--success)]",
  awaiting_approval: "bg-[rgba(200,95,45,0.12)] text-[var(--accent-ink)]",
  urgent: "bg-[rgba(167,65,51,0.14)] text-[var(--danger)]",
  high: "bg-[rgba(200,95,45,0.12)] text-[var(--accent-ink)]",
  normal: "bg-[rgba(16,32,48,0.08)] text-[var(--foreground)]",
  low: "bg-[rgba(28,107,103,0.12)] text-[var(--secondary)]",
};

export function StatusBadge({ value }: { value: string }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-3 py-1 text-xs font-semibold tracking-wide",
        toneMap[value] ?? "bg-[rgba(16,32,48,0.08)] text-[var(--foreground)]",
      )}
    >
      {sentenceCase(value.replace(/_/g, " "))}
    </span>
  );
}
