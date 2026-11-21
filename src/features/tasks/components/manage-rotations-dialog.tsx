"use client";
import { useActionState, useState, useTransition, useEffect } from "react";
import type { TaskRotation } from "@/features/tasks/queries-rotations";
import {
  createRotation,
  updateRotation,
  deleteRotation,
  addRotationMember,
  removeRotationMember,
  reorderRotationMember,
} from "@/features/tasks/actions-rotations";
import { initialFormState } from "@/features/auth/form-state";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/feedback/confirm-dialog";

const DAY_LABELS = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];

interface ManageRotationsDialogProps {
  rotations: TaskRotation[];
  homeMembers: { id: string; name: string | null }[];
  open: boolean;
  onClose: () => void;
}

const inputClass = "border-input bg-background flex h-9 w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function ManageRotationsDialog({ rotations, homeMembers, open, onClose }: ManageRotationsDialogProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDay, setEditDay] = useState(0);
  const [addMemberMap, setAddMemberMap] = useState<Record<string, string>>({});

  const [createState, createDispatch, createPending] = useActionState(createRotation, initialFormState);
  const [updateState, updateDispatch, updatePending] = useActionState(updateRotation, initialFormState);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (updateState.status === "success") setEditingId(null);
  }, [updateState]);

  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  function startEdit(rot: TaskRotation) {
    setEditingId(rot.id);
    setEditName(rot.name);
    setEditDay(rot.rotation_day);
  }

  function handleDelete(rot: TaskRotation) {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("id", rot.id);
      await deleteRotation(initialFormState, fd);
    });
  }

  function handleRemoveMember(rotationId: string, profileId: string) {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("rotation_id", rotationId);
      fd.set("profile_id", profileId);
      await removeRotationMember(initialFormState, fd);
    });
  }

  function handleMove(rotationId: string, memberIdx: number, direction: "up" | "down") {
    const rot = rotations.find((r) => r.id === rotationId);
    if (!rot) return;
    const otherIdx = direction === "up" ? memberIdx - 1 : memberIdx + 1;
    const member = rot.members[memberIdx]!;
    const otherMember = rot.members[otherIdx]!;
    startTransition(async () => {
      const fd1 = new FormData();
      fd1.set("rotation_id", rotationId);
      fd1.set("profile_id", member.profile_id);
      fd1.set("sort_order", String(otherMember.sort_order));
      await reorderRotationMember(initialFormState, fd1);
      const fd2 = new FormData();
      fd2.set("rotation_id", rotationId);
      fd2.set("profile_id", otherMember.profile_id);
      fd2.set("sort_order", String(member.sort_order));
      await reorderRotationMember(initialFormState, fd2);
    });
  }

  function handleAddMember(rotationId: string) {
    const profileId = addMemberMap[rotationId];
    if (!profileId) return;
    const rot = rotations.find(r => r.id === rotationId);
    const nextOrder = rot ? (rot.members.length > 0 ? Math.max(...rot.members.map(m => m.sort_order)) + 1 : 0) : 0;
    startTransition(async () => {
      const fd = new FormData();
      fd.set("rotation_id", rotationId);
      fd.set("profile_id", profileId);
      fd.set("sort_order", String(nextOrder));
      await addRotationMember(initialFormState, fd);
    });
    setAddMemberMap(prev => ({ ...prev, [rotationId]: "" }));
  }

  return (
    <div
      role="dialog"
      aria-modal
      aria-label="Gerenciar rodízios"
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 pt-12"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-lg rounded-xl border border-border bg-card shadow-lg" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-base font-semibold">Gerenciar rodízios</h2>
          <Button type="button" variant="ghost" size="sm" onClick={onClose} aria-label="Fechar">
            ✕ Fechar
          </Button>
        </div>

        <div className="space-y-6 p-6">
          {rotations.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum rodízio criado ainda.</p>
          ) : (
            rotations.map((rot) => {
              const memberIds = new Set(rot.members.map(m => m.profile_id));
              const available = homeMembers.filter(m => !memberIds.has(m.id));

              return (
                <div key={rot.id} className="rounded-lg border border-border p-4 space-y-3">
                  {editingId === rot.id ? (
                    <form action={updateDispatch} className="space-y-2">
                      <input type="hidden" name="id" value={rot.id} />
                      <input
                        name="name"
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        className={inputClass}
                        required
                      />
                      <select
                        name="rotation_day"
                        value={editDay}
                        onChange={e => setEditDay(Number(e.target.value))}
                        className={inputClass}
                      >
                        {DAY_LABELS.map((label, i) => (
                          <option key={i} value={i}>{label}</option>
                        ))}
                      </select>
                      {updateState.status === "error" && updateState.message ? (
                        <p className="text-xs text-destructive">{updateState.message}</p>
                      ) : null}
                      <div className="flex gap-2">
                        <Button type="submit" size="sm" disabled={updatePending}>Salvar</Button>
                        <Button type="button" variant="ghost" size="sm" onClick={() => setEditingId(null)}>Cancelar</Button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{rot.name}</p>
                        <p className="text-xs text-muted-foreground">{DAY_LABELS[rot.rotation_day]}</p>
                      </div>
                      <div className="flex gap-1">
                        <Button type="button" variant="ghost" size="sm" onClick={() => startEdit(rot)}>
                          Editar
                        </Button>
                        <ConfirmDialog
                          trigger={<Button type="button" variant="ghost" size="sm">Excluir</Button>}
                          title={`Excluir rodízio "${rot.name}"?`}
                          description={`As tarefas do rodízio '${rot.name}' ficarão sem rodízio associado.`}
                          confirmLabel="Excluir"
                          destructive
                          onConfirm={() => handleDelete(rot)}
                        />
                      </div>
                    </div>
                  )}

                  {rot.members.length > 0 ? (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Participantes</p>
                      {rot.members.map((member, idx) => (
                        <div key={member.profile_id} className="flex items-center justify-between rounded px-2 py-1 hover:bg-muted/50">
                          <span className="text-sm">{homeMembers.find((m) => m.id === member.profile_id)?.name ?? member.profile_id}</span>
                          <div className="flex gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              disabled={idx === 0 || isPending}
                              aria-label="Mover para cima"
                              onClick={() => handleMove(rot.id, idx, "up")}
                            >
                              ↑
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              disabled={idx === rot.members.length - 1 || isPending}
                              aria-label="Mover para baixo"
                              onClick={() => handleMove(rot.id, idx, "down")}
                            >
                              ↓
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              disabled={isPending}
                              onClick={() => handleRemoveMember(rot.id, member.profile_id)}
                            >
                              Remover
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">Sem participantes.</p>
                  )}

                  {available.length > 0 ? (
                    <div className="flex gap-2">
                      <select
                        className={`${inputClass} flex-1`}
                        value={addMemberMap[rot.id] ?? ""}
                        onChange={e => setAddMemberMap(prev => ({ ...prev, [rot.id]: e.target.value }))}
                      >
                        <option value="">Adicionar participante…</option>
                        {available.map(m => (
                          <option key={m.id} value={m.id}>{m.name ?? m.id}</option>
                        ))}
                      </select>
                      <Button
                        type="button"
                        size="sm"
                        disabled={!addMemberMap[rot.id] || isPending}
                        onClick={() => handleAddMember(rot.id)}
                      >
                        Adicionar
                      </Button>
                    </div>
                  ) : null}
                </div>
              );
            })
          )}

          <div className="border-t border-border pt-4">
            <h3 className="mb-3 text-sm font-semibold">Novo rodízio</h3>
            <form action={createDispatch} className="space-y-3">
              <input name="name" placeholder="Nome do grupo" className={inputClass} required />
              <select name="rotation_day" className={inputClass}>
                {DAY_LABELS.map((label, i) => (
                  <option key={i} value={i}>{label}</option>
                ))}
              </select>
              {createState.status === "error" && createState.message ? (
                <p className="text-xs text-destructive">{createState.message}</p>
              ) : null}
              <Button type="submit" size="sm" disabled={createPending}>
                {createPending ? "Criando…" : "Criar"}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
