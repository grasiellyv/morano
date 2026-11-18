"use client";

import { useActionState } from "react";
import { LogOut } from "lucide-react";
import { signOut } from "@/features/auth/actions";
import { initialFormState } from "@/features/auth/form-state";
import { cn } from "@/lib/utils";

/**
 * Botão "Sair". `variant="row"` segue o estilo das linhas da sidebar;
 * `variant="icon"` é o botão só com ícone do cabeçalho móvel.
 */
export function SignOutButton({
  variant = "row",
  className,
}: {
  variant?: "row" | "icon";
  className?: string;
}) {
  const [, formAction, pending] = useActionState(signOut, initialFormState);
  return (
    <form action={formAction}>
      <button
        type="submit"
        disabled={pending}
        aria-label={variant === "icon" ? "Sair" : undefined}
        className={cn(
          "focus-visible:ring-ring outline-none focus-visible:ring-2 disabled:opacity-50",
          variant === "icon"
            ? "text-foreground hover:bg-sand/60 flex size-11 items-center justify-center rounded-full"
            : "text-muted-foreground hover:bg-sand/60 flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium",
          className,
        )}
      >
        <LogOut aria-hidden className="size-5" />
        {variant === "row" ? (pending ? "Saindo…" : "Sair") : null}
      </button>
    </form>
  );
}
