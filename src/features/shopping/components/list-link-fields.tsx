import type { ShoppingCategory } from "@/features/shopping/queries-categories";
import { MISSIONS, MISSION_LABELS } from "@/features/shopping/schemas";

const selectClass =
  "h-9 w-full rounded-lg border border-input bg-background px-2 py-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50";

/**
 * Missão/ocasião e categoria padrão de uma lista inteligente. Os dois campos são
 * `mission` e `category_id` do formulário ("" = sem vínculo).
 */
export function ListLinkFields({
  categories,
  defaultMission,
  defaultCategoryId,
  disabled,
}: {
  categories: ShoppingCategory[];
  defaultMission: string | null;
  defaultCategoryId: string | null;
  disabled: boolean;
}) {
  return (
    <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
      <label className="block text-xs font-medium text-muted-foreground">
        Missão ou ocasião
        <select
          name="mission"
          defaultValue={defaultMission ?? ""}
          disabled={disabled}
          aria-label="Missão ou ocasião"
          className={selectClass + " mt-1"}
        >
          <option value="">Nenhuma</option>
          {MISSIONS.map((m) => (
            <option key={m} value={m}>
              {MISSION_LABELS[m]}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-xs font-medium text-muted-foreground">
        Categoria padrão
        <select
          name="category_id"
          defaultValue={defaultCategoryId ?? ""}
          disabled={disabled}
          aria-label="Categoria padrão"
          className={selectClass + " mt-1"}
        >
          <option value="">Nenhuma</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
