import { cn, sentenceCase } from "@/lib/utils";

const toneMap: Record<string, string> = {
  open: "bg-[rgba(133,247,217,0.14)] text-[var(--accent)]",
  pending: "bg-[rgba(255,201,107,0.14)] text-[var(--warning)]",
  resolved: "bg-[rgba(113,240,165,0.16)] text-[var(--success)]",
  indexed: "bg-[rgba(113,240,165,0.16)] text-[var(--success)]",
  queued: "bg-[rgba(237,244,255,0.08)] text-[var(--foreground)]",
  indexing: "bg-[rgba(133,247,217,0.14)] text-[var(--accent)]",
  failed: "bg-[rgba(255,109,133,0.14)] text-[var(--danger)]",
  approved: "bg-[rgba(113,240,165,0.16)] text-[var(--success)]",
  rejected: "bg-[rgba(255,109,133,0.14)] text-[var(--danger)]",
  expired: "bg-[rgba(237,244,255,0.08)] text-[var(--muted)]",
  running: "bg-[rgba(133,247,217,0.14)] text-[var(--accent)]",
  completed: "bg-[rgba(113,240,165,0.16)] text-[var(--success)]",
  awaiting_approval: "bg-[rgba(255,134,88,0.14)] text-[var(--secondary)]",
  urgent: "bg-[rgba(255,109,133,0.14)] text-[var(--danger)]",
  high: "bg-[rgba(255,134,88,0.14)] text-[var(--secondary)]",
  normal: "bg-[rgba(237,244,255,0.08)] text-[var(--foreground)]",
  low: "bg-[rgba(133,247,217,0.14)] text-[var(--accent)]",
};

export function StatusBadge({ value }: { value: string }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full border border-[var(--line)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]",
        toneMap[value] ?? "bg-[rgba(237,244,255,0.08)] text-[var(--foreground)]",
      )}
    >
      {sentenceCase(value.replace(/_/g, " "))}
    </span>
  );
}
