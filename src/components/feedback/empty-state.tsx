import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type EmptyStateProps = {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
};

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="border-border flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-12 text-center">
      {Icon ? <Icon aria-hidden className="text-sage-ink size-8" /> : null}
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="text-muted-foreground max-w-sm text-sm">{description}</p>
      {action ? <div className="pt-2">{action}</div> : null}
    </div>
  );
}
