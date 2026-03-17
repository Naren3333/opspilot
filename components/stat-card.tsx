export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-[1.5rem] border border-[var(--line)] bg-[linear-gradient(180deg,rgba(14,22,36,0.94),rgba(8,14,24,0.88))] p-5">
      <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-[var(--muted)]">{label}</p>
      <p className="mt-4 text-3xl font-semibold text-[var(--foreground)]">{value}</p>
      <p className="mt-2 text-sm text-[var(--muted)]">{hint}</p>
    </div>
  );
}
