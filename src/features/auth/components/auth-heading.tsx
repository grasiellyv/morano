import type { ReactNode } from "react";

export function AuthHeading({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="mb-6 space-y-1.5">
      <h1 className="font-heading text-2xl font-semibold tracking-tight">{title}</h1>
      {children ? <p className="text-muted-foreground text-sm">{children}</p> : null}
    </div>
  );
}

export const authLinkClass =
  "text-foreground focus-visible:ring-ring inline-flex min-h-11 items-center rounded-md font-medium underline underline-offset-4 outline-none focus-visible:ring-2";
