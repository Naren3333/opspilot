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
        "rounded-[1.75rem] border border-[var(--line)] bg-white/75 p-6 shadow-[0_16px_42px_rgba(45,41,36,0.08)] backdrop-blur-sm",
        className,
      )}
    >
      {children}
    </section>
  );
}
