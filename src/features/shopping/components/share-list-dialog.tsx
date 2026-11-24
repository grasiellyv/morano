"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Check, Copy, Link2, Share2, X } from "lucide-react";
import { toast } from "sonner";
import { createShareLink, revokeShareLink } from "@/features/shopping/actions-share";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/feedback/confirm-dialog";

/**
 * Botão de compartilhar + diálogo. O link abre uma página SÓ de visualização
 * (/lista/<token>) que funciona para quem não tem conta. Desativar o link apaga o
 * token: quem já recebeu passa a ver "link indisponível".
 */
export function ShareListButton({ token }: { token: string | null }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const url = token && typeof window !== "undefined" ? `${window.location.origin}/lista/${token}` : "";
  const canNativeShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const trigger = triggerRef.current;
    return () => {
      document.removeEventListener("keydown", onKey);
      trigger?.focus();
    };
  }, [open]);

  function create() {
    startTransition(async () => {
      const res = await createShareLink();
      if (res.status === "error") toast.error(res.message ?? "Não foi possível criar o link.");
    });
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copiado");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Não foi possível copiar. Selecione o link e copie manualmente.");
    }
  }

  async function nativeShare() {
    try {
      await navigator.share({ title: "Lista de compras da casa", url });
    } catch {
      // Pessoa cancelou o compartilhamento: nada a fazer.
    }
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Compartilhar lista"
        aria-haspopup="dialog"
        className="flex size-10 shrink-0 items-center justify-center rounded-full border border-border"
        style={{ background: "var(--card)" }}
      >
        <Share2 size={18} aria-hidden />
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="share-title"
            className="w-full max-w-md rounded-[20px] border border-border p-5 shadow-xl"
            style={{ background: "var(--background)" }}
          >
            <div className="mb-3 flex items-start gap-3">
              <div className="flex-1">
                <h2 id="share-title" className="text-[17px] font-semibold">Compartilhar lista</h2>
                <p className="mt-1 text-[13px]" style={{ color: "var(--muted-foreground)" }}>
                  Quem receber o link vê a lista atualizada, sem precisar de conta. Só visualiza: não
                  adiciona nem altera nada.
                </p>
              </div>
              <button
                ref={closeRef}
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fechar"
                className="-mr-2 -mt-1 flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary"
              >
                <X size={18} aria-hidden />
              </button>
            </div>

            {token ? (
              <div className="space-y-3">
                <input
                  readOnly
                  value={url}
                  aria-label="Link de visualização"
                  onFocus={(e) => e.currentTarget.select()}
                  className="h-11 w-full rounded-lg border border-input bg-card px-3 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <div className="flex gap-2">
                  <Button type="button" variant="add" className="flex-1 gap-2" style={{ height: 44 }} onClick={copy}>
                    {copied ? <Check size={17} aria-hidden /> : <Copy size={17} aria-hidden />}
                    {copied ? "Copiado" : "Copiar link"}
                  </Button>
                  {canNativeShare ? (
                    <Button type="button" variant="outline" className="gap-2" style={{ height: 44 }} onClick={nativeShare}>
                      <Share2 size={17} aria-hidden />
                      Enviar
                    </Button>
                  ) : null}
                </div>
                <ConfirmDialog
                  trigger={
                    <button
                      type="button"
                      disabled={pending}
                      className="w-full rounded-lg py-2 text-[13px] font-medium text-destructive hover:bg-destructive/10"
                    >
                      Desativar link
                    </button>
                  }
                  title="Desativar link"
                  description="Quem já recebeu o link deixa de ver a lista. Você pode criar um novo depois."
                  confirmLabel="Desativar"
                  destructive
                  onConfirm={async () => {
                    const res = await revokeShareLink();
                    if (res.status === "error") throw new Error(res.message ?? "Erro ao desativar.");
                    toast.success("Link desativado");
                  }}
                />
              </div>
            ) : (
              <Button
                type="button"
                variant="add"
                disabled={pending}
                className="w-full gap-2 text-[15px] font-semibold"
                style={{ height: 48 }}
                onClick={create}
              >
                <Link2 size={18} aria-hidden />
                {pending ? "Criando…" : "Criar link de visualização"}
              </Button>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
