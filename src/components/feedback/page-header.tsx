import type { ReactNode } from "react";

type PageHeaderProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
};

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 pb-5">
      <div className="min-w-0 space-y-0.5">
        <h1
          style={{ fontSize: 24, fontWeight: 400, letterSpacing: "-0.4px", color: "var(--foreground)", lineHeight: 1.2 }}
        >
          {title}
        </h1>
        {description ? <p className="text-muted-foreground text-sm">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}
