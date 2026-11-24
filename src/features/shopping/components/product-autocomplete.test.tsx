import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { ProductAutocomplete } from "./product-autocomplete";
import type { ProductSuggestion, SuggestionSources } from "@/features/shopping/suggest";

const sources: SuggestionSources = {
  home: [{ name: "Leite", category_id: "cat-ali", unit: "l" }],
  categories: [{ id: "cat-ali", default_slug: "alimentacao" }],
};

function Harness({ onSelect }: { onSelect: (s: ProductSuggestion) => void }) {
  const [value, setValue] = useState("");
  return (
    <ProductAutocomplete
      name="name"
      value={value}
      onValueChange={setValue}
      onSelect={(s) => { setValue(s.name); onSelect(s); }}
      sources={sources}
      placeholder="Nome do produto…"
    />
  );
}

describe("ProductAutocomplete", () => {
  it("sugere só depois do debounce e entrega unidade/categoria ao selecionar", async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(<Harness onSelect={onSelect} />);
    await user.type(screen.getByRole("combobox"), "le");
    expect(screen.queryByRole("option")).toBeNull();
    await user.click(await screen.findByRole("option", { name: /^Leite\s?Já usado em casa$/ }));
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ name: "Leite", unit: "l", categoryId: "cat-ali" }));
    expect(screen.queryByRole("option")).toBeNull();
  });

  it("com 1 caractere não sugere nada", async () => {
    const user = userEvent.setup();
    render(<Harness onSelect={vi.fn()} />);
    await user.type(screen.getByRole("combobox"), "l");
    await new Promise((r) => setTimeout(r, 400));
    expect(screen.queryByRole("option")).toBeNull();
  });

  it("setas + Enter selecionam; Esc fecha", async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(<Harness onSelect={onSelect} />);
    await user.type(screen.getByRole("combobox"), "lei");
    await screen.findByRole("option", { name: /^Leite\s?Já usado em casa$/ });
    await user.keyboard("{ArrowDown}{Enter}");
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ name: "Leite" }));

    await user.clear(screen.getByRole("combobox"));
    await user.type(screen.getByRole("combobox"), "lei");
    await screen.findByRole("option", { name: /^Leite\s?Já usado em casa$/ });
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("option")).toBeNull();
  });

  it("a lista fica acima de barras fixas (z-50) e rola se for longa", async () => {
    const user = userEvent.setup();
    render(<Harness onSelect={vi.fn()} />);
    await user.type(screen.getByRole("combobox"), "lei");
    const list = await screen.findByRole("listbox");
    expect(list.className).toMatch(/\bz-50\b/);
    expect(list.className).toMatch(/overflow-y-auto/);
    expect(list.className).toMatch(/max-h-/);
  });
});
