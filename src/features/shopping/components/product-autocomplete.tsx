"use client";

import { useId, useMemo, useState } from "react";
import { Star } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import {
  SUGGEST_DEBOUNCE_MS,
  suggestProducts,
  type ProductSuggestion,
  type SuggestionSources,
} from "@/features/shopping/suggest";

type Props = {
  name: string;
  value: string;
  onValueChange: (value: string) => void;
  onSelect: (suggestion: ProductSuggestion) => void;
  sources: SuggestionSources;
  placeholder: string;
  inputRef?: React.Ref<HTMLInputElement>;
  inputProps?: Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "name" | "placeholder">;
};

/** Campo de produto com sugestões (combobox ARIA): casa primeiro, depois o catálogo. */
export function ProductAutocomplete({ name, value, onValueChange, onSelect, sources, placeholder, inputRef, inputProps }: Props) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const debounced = useDebouncedValue(value, SUGGEST_DEBOUNCE_MS);
  const suggestions = useMemo(() => suggestProducts(debounced, sources), [debounced, sources]);
  const visible = open && suggestions.length > 0;

  function choose(s: ProductSuggestion) {
    setOpen(false);
    setActive(-1);
    onSelect(s);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!visible) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === "Enter" && active >= 0) {
      e.preventDefault();
      choose(suggestions[active]!);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    }
  }

  return (
    <div className="relative">
      <Input
        {...inputProps}
        ref={inputRef}
        name={name}
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={visible}
        aria-controls={listId}
        aria-activedescendant={visible && active >= 0 ? `${listId}-${active}` : undefined}
        onChange={(e) => {
          onValueChange(e.target.value);
          setActive(-1);
          setOpen(true);
        }}
        onKeyDown={handleKeyDown}
        onBlur={() => setOpen(false)}
      />
      {visible ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-y-auto rounded-lg border border-border bg-card shadow-sm"
        >
          {suggestions.map((s, i) => (
            <li
              key={`${s.source}-${s.name}`}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              // pointerdown + preventDefault: escolhe antes do blur fechar a lista (mouse e toque)
              onPointerDown={(e) => {
                e.preventDefault();
                choose(s);
              }}
              className={"flex w-full cursor-pointer items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-muted " + (i === active ? "bg-muted" : "")}
            >
              <span className="flex-1">{s.name}</span>
              {s.source === "casa" ? (
                <>
                  <Star size={14} strokeWidth={1.75} aria-hidden className="shrink-0 text-muted-foreground" />
                  <span className="sr-only">Já usado em casa</span>
                </>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
