import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function SectionCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-[1.75rem] border border-[var(--line)] bg-[linear-gradient(180deg,rgba(12,18,30,0.96),rgba(6,10,18,0.92))] p-6 shadow-[var(--shadow)] backdrop-blur-xl",
        className,
      )}
    >
      {children}
    </section>
  );
}
