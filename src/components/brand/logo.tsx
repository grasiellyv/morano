import { cn } from "@/lib/utils";

const SIZES = { sm: 18, md: 22, lg: 40 } as const;

export function Logo({
  size = "md",
  className,
}: {
  size?: keyof typeof SIZES;
  className?: string;
}) {
  return (
    <span
      role="img"
      aria-label="MORANO"
      className={cn(
        "font-heading text-foreground leading-none font-semibold tracking-[-0.035em]",
        className,
      )}
      style={{ fontSize: SIZES[size] }}
    >
      morano<span style={{ color: "#D98A2B" }}>.</span>
    </span>
  );
}
