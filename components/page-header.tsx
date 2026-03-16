import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.28em] text-[var(--muted)]">{eyebrow}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">{title}</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--muted)]">{description}</p>
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </div>
  );
}
