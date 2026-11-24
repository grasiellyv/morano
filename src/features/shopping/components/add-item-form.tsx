"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, DoorOpen, Plus, SlidersHorizontal, TriangleAlert } from "lucide-react";
import { addItem } from "@/features/shopping/actions";
import { initialFormState, type FormState } from "@/features/auth/form-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ShoppingCategory } from "@/features/shopping/queries-categories";
import { ProductAutocomplete } from "@/features/shopping/components/product-autocomplete";
import type { ProductSuggestion, ShoppingUnit, SuggestionSources } from "@/features/shopping/suggest";
import { MISSIONS, MISSION_LABELS, type Mission } from "@/features/shopping/schemas";
import { CategoryIcon } from "@/features/shopping/category-icon";
import { findDuplicate } from "@/features/shopping/dedupe";
import { toast } from "sonner";

const selectClass =
  "h-9 rounded-lg border border-input bg-background px-2 py-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50";

/** Chip de escolha única. Selecionado = escuro sobre claro (estado por luminosidade). */
function chipClass(selected: boolean) {
  return [
    "inline-flex h-9 items-center gap-1.5 rounded-[10px] border px-3 text-[13px] font-medium transition-colors",
    "outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50",
    selected
      ? "border-transparent bg-[var(--nav-active)] text-[var(--nav-active-ink)]"
      : "border-border bg-card text-foreground hover:bg-secondary",
  ].join(" ");
}

function FieldLabel({ id, children }: { id?: string; children: React.ReactNode }) {
  return (
    <p id={id} className="mb-2 text-[12.5px] font-semibold text-foreground">
      {children}
    </p>
  );
}

type Props = {
  categories: ShoppingCategory[];
  rooms: { id: string; name: string }[];
  /** Fontes do autocomplete: o que a casa já usou + categorias (para o catálogo padrão). */
  sources: SuggestionSources;
  /** Itens pendentes: usados para avisar de duplicados enquanto a pessoa digita. */
  pendingItems?: { name: string; quantity: number; unit: string }[];
  onSuccess?: () => void;
};

export function AddItemForm({ categories, rooms, sources, pendingItems = [], onSuccess }: Props) {
  const nameRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const detailsId = useId();
  const [expanded, setExpanded] = useState(false);
  // Se a pessoa minimizou de propósito, não reabrimos sozinhos enquanto digita.
  const userToggled = useRef(false);
  const [nameValue, setNameValue] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [roomId, setRoomId] = useState("");
  const [mission, setMission] = useState<Mission | "">("");
  const [priority, setPriority] = useState<"normal" | "urgente">("normal");
  const [unit, setUnit] = useState<ShoppingUnit>("un");

  const wrappedAdd = async (prev: FormState, fd: FormData): Promise<FormState> => {
    const result = await addItem(prev, fd);
    if (result.status === "success") {
      toast.success(result.message ?? "Item adicionado.");
      setNameValue("");
      setCategoryId("");
      setRoomId("");
      setMission("");
      setPriority("normal");
      setUnit("un");
      setExpanded(false);
      userToggled.current = false;
      onSuccess?.();
    }
    return result;
  };

  const [state, dispatch, pending] = useActionState(wrappedAdd, initialFormState);

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
      nameRef.current?.focus();
    }
  }, [state]);

  function handleNameChange(val: string) {
    setNameValue(val);
    if (val.trim().length > 0 && !userToggled.current) setExpanded(true);
  }

  function selectSuggestion(item: ProductSuggestion) {
    setNameValue(item.name);
    if (item.categoryId) setCategoryId(item.categoryId);
    if (item.unit) setUnit(item.unit);
    if (!userToggled.current) setExpanded(true);
    nameRef.current?.focus();
  }

  function toggleDetails() {
    userToggled.current = true;
    setExpanded((v) => !v);
  }

  const duplicate = findDuplicate(pendingItems, nameValue);
  const selectedCategory = categories.find((c) => c.id === categoryId);
  const summaryParts = [
    selectedCategory?.name,
    mission ? MISSION_LABELS[mission] : null,
    priority === "urgente" ? "Urgente" : null,
  ].filter(Boolean);
  const summary = summaryParts.length > 0 ? summaryParts.join(" · ") : "Categoria, missão, prioridade e mais";

  return (
    <form ref={formRef} action={dispatch} className="space-y-3">
      {/* Name */}
      <ProductAutocomplete
        name="name"
        value={nameValue}
        onValueChange={handleNameChange}
        onSelect={selectSuggestion}
        sources={sources}
        placeholder="Nome do produto…"
        inputRef={nameRef}
        inputProps={{
          required: true,
          disabled: pending,
          "aria-label": "Nome do produto",
          "aria-invalid": !!state.fieldErrors?.name,
          className: "w-full text-base",
          style: { height: 44 },
        }}
      />

      {state.fieldErrors?.name ? (
        <p className="text-xs text-destructive">{state.fieldErrors.name}</p>
      ) : null}

      {duplicate ? (
        <p role="status" className="rounded-lg px-3 py-2 text-xs font-medium" style={{ background: "#F6DDB9", color: "#6E420F" }}>
          “{duplicate.name}” já está na lista ({duplicate.quantity} {duplicate.unit}). Se a unidade for a mesma, a quantidade é somada.
        </p>
      ) : null}

      {/* Quantidade + Unidade (visible upfront) */}
      <div className="flex gap-2">
        <label className="flex flex-1 items-center gap-1.5">
          <span className="shrink-0 text-xs text-muted-foreground">Qtd.</span>
          <Input
            name="quantity"
            type="number"
            min="0.01"
            step="any"
            defaultValue="1"
            disabled={pending}
            aria-label="Quantidade"
            className="flex-1"
            style={{ height: 36 }}
          />
        </label>
        <select name="unit" value={unit} onChange={(e) => setUnit(e.target.value as ShoppingUnit)} disabled={pending} className={selectClass} aria-label="Unidade">
          <option value="un">un</option>
          <option value="kg">kg</option>
          <option value="g">g</option>
          <option value="l">l</option>
          <option value="ml">ml</option>
          <option value="pacote">pacote</option>
          <option value="caixa">caixa</option>
        </select>
      </div>

      {/* Detalhes — seção própria, expansível/minimizável */}
      <section className="overflow-hidden rounded-xl border border-border bg-secondary/50">
        <button
          type="button"
          onClick={toggleDetails}
          aria-expanded={expanded}
          aria-controls={detailsId}
          className="flex min-h-[56px] w-full items-center gap-3 px-3.5 py-2.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
        >
          <span
            className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-card text-foreground"
            aria-hidden
          >
            <SlidersHorizontal size={16} strokeWidth={1.75} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-foreground">Detalhes</span>
            <span className="block truncate text-xs text-muted-foreground">{summary}</span>
          </span>
          <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-muted-foreground">
            {expanded ? "Minimizar" : "Expandir"}
            <ChevronDown
              size={16}
              strokeWidth={1.75}
              aria-hidden
              className={"transition-transform duration-200 " + (expanded ? "rotate-180" : "")}
            />
          </span>
        </button>

        <div
          className="grid transition-[grid-template-rows] duration-200 ease-out"
          style={{ gridTemplateRows: expanded ? "1fr" : "0fr" }}
        >
          <div className="min-h-0 overflow-hidden">
            <div id={detailsId} inert={!expanded} className="space-y-4 border-t border-border px-3.5 pb-4 pt-3.5">
              {/* Categoria */}
              <div role="radiogroup" aria-labelledby={`${detailsId}-cat`}>
                <FieldLabel id={`${detailsId}-cat`}>Categoria</FieldLabel>
                <input type="hidden" name="category_id" value={categoryId} />
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    role="radio"
                    aria-checked={categoryId === ""}
                    onClick={() => setCategoryId("")}
                    disabled={pending}
                    className={chipClass(categoryId === "")}
                  >
                    Nenhuma
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      role="radio"
                      aria-checked={categoryId === cat.id}
                      onClick={() => setCategoryId(cat.id)}
                      disabled={pending}
                      className={chipClass(categoryId === cat.id)}
                    >
                      <CategoryIcon icon={cat.icon} size={15} />
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Missão */}
              <div role="radiogroup" aria-labelledby={`${detailsId}-mis`}>
                <FieldLabel id={`${detailsId}-mis`}>Missão</FieldLabel>
                <input type="hidden" name="mission" value={mission} />
                <div className="flex flex-wrap gap-1.5">
                  {(["", ...MISSIONS] as const).map((m) => (
                    <button
                      key={m || "none"}
                      type="button"
                      role="radio"
                      aria-checked={mission === m}
                      onClick={() => setMission(m)}
                      disabled={pending}
                      className={chipClass(mission === m)}
                    >
                      {m ? MISSION_LABELS[m] : "Nenhuma"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Prioridade */}
              <div role="radiogroup" aria-labelledby={`${detailsId}-pri`}>
                <FieldLabel id={`${detailsId}-pri`}>Prioridade</FieldLabel>
                <input type="hidden" name="priority" value={priority} />
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    role="radio"
                    aria-checked={priority === "normal"}
                    onClick={() => setPriority("normal")}
                    disabled={pending}
                    className={chipClass(priority === "normal")}
                  >
                    Normal
                  </button>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={priority === "urgente"}
                    onClick={() => setPriority("urgente")}
                    disabled={pending}
                    className={
                      priority === "urgente"
                        ? "inline-flex h-9 items-center gap-1.5 rounded-[10px] border border-[var(--warn-ink)] bg-[var(--warn-bg)] px-3 text-[13px] font-semibold text-[var(--warn-ink)] outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        : chipClass(false)
                    }
                  >
                    <TriangleAlert size={15} strokeWidth={1.75} aria-hidden />
                    Urgente
                  </button>
                </div>
              </div>

              {/* Observação */}
              <label className="block">
                <span className="mb-2 block text-[12.5px] font-semibold text-foreground">Observação</span>
                <Input
                  name="notes"
                  placeholder="Marca, preferência…"
                  maxLength={200}
                  disabled={pending}
                  style={{ height: 40 }}
                />
              </label>

              {/* Cômodo — opcional, só os cômodos cadastrados na casa */}
              <div role="radiogroup" aria-labelledby={`${detailsId}-room`}>
                <FieldLabel id={`${detailsId}-room`}>
                  Cômodo <span className="font-normal text-muted-foreground">(opcional)</span>
                </FieldLabel>
                <input type="hidden" name="room_id" value={roomId} />
                <p className="-mt-1 mb-2 text-xs text-muted-foreground">
                  Só se o item é de um lugar específico, como lâmpada para a cozinha.
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    role="radio"
                    aria-checked={roomId === ""}
                    onClick={() => setRoomId("")}
                    disabled={pending}
                    className={chipClass(roomId === "")}
                  >
                    Nenhum
                  </button>
                  {rooms.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      role="radio"
                      aria-checked={roomId === r.id}
                      onClick={() => setRoomId(r.id)}
                      disabled={pending}
                      className={chipClass(roomId === r.id)}
                    >
                      <DoorOpen size={15} aria-hidden />
                      {r.name}
                    </button>
                  ))}
                </div>
                <Link
                  href="/casa/comodos"
                  className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-add-ink underline-offset-4 hover:underline"
                >
                  <Plus size={13} aria-hidden />
                  {rooms.length === 0 ? "Cadastrar cômodos da casa" : "Gerenciar cômodos da casa"}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {state.status === "error" && state.message ? (
        <p className="text-xs text-destructive">{state.message}</p>
      ) : null}

      <Button type="submit" variant="add" disabled={pending} className="w-full gap-2 text-[15px] font-semibold" style={{ height: 48 }}>
        <Plus size={18} strokeWidth={1.75} aria-hidden />
        {pending ? "Adicionando…" : "Adicionar à lista"}
      </Button>
    </form>
  );
}
