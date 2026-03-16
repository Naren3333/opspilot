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
    <div className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--card-strong)] p-5">
      <p className="font-mono text-xs uppercase tracking-[0.24em] text-[var(--muted)]">{label}</p>
      <p className="mt-4 text-3xl font-semibold">{value}</p>
      <p className="mt-2 text-sm text-[var(--muted)]">{hint}</p>
    </div>
  );
}
