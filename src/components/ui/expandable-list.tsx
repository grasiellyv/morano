"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";

/**
 * Lista com "Ver tudo (N a mais)". O botão fica SEMPRE depois do último item visível:
 * fechada, logo abaixo dos primeiros; aberta, no fim da lista inteira (com "Mostrar menos").
 * (Um <details> nativo não serve: o <summary> precisa ser o primeiro filho.)
 */
export function ExpandableList({
  children,
  more,
  moreCount,
}: {
  children: React.ReactNode;
  more: React.ReactNode;
  moreCount: number;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {children}
      {open ? more : null}
      {moreCount > 0 ? (
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="flex w-full cursor-pointer items-center gap-2 px-3.5 text-left text-[12.5px] font-medium"
          style={{ height: 40, background: "var(--secondary)", color: "var(--muted-foreground)" }}
        >
          <span className="flex-1">{open ? "Mostrar menos" : `Ver tudo (${moreCount} a mais)`}</span>
          <ChevronRight aria-hidden size={15} className={open ? "-rotate-90" : "rotate-90"} />
        </button>
      ) : null}
    </>
  );
}
