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
        "font-heading text-graphite leading-none font-semibold tracking-[-0.035em]",
        className,
      )}
      style={{ fontSize: SIZES[size] }}
    >
      morano<span className="text-caramel">.</span>
    </span>
  );
}
