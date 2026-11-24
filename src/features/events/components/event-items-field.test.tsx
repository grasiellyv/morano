import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}));

import { EventItemsField } from "./event-items-field";
import type { SuggestionSources } from "@/features/shopping/suggest";

const sources: SuggestionSources = {
  home: [{ name: "Leite", category_id: "11111111-1111-4111-8111-111111111111", unit: "l" }],
  categories: [{ id: "11111111-1111-4111-8111-111111111111", default_slug: "alimentacao" }],
};

function hiddenItems(): unknown[] {
  const el = document.querySelector<HTMLInputElement>('input[name="items"]');
  return JSON.parse(el!.value);
}

async function addLeite(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Produto do evento"), "lei");
  await user.click(await screen.findByRole("option", { name: /^Leite\s?Já usado em casa$/ }));
  await user.click(screen.getByRole("button", { name: "Adicionar item" }));
}

describe("EventItemsField", () => {
  it("começa sem itens", () => {
    render(<EventItemsField sources={sources} />);
    expect(hiddenItems()).toEqual([]);
    expect(screen.getByText("Itens / Compras necessárias")).toBeInTheDocument();
  });

  it("escolher sugestão e adicionar cria o chip e o campo items", async () => {
    const user = userEvent.setup();
    render(<EventItemsField sources={sources} />);
    await addLeite(user);
    expect(screen.getByText("Leite · 1 l")).toBeInTheDocument();
    expect(hiddenItems()).toEqual([{ name: "Leite", quantity: 1, unit: "l", category_id: "11111111-1111-4111-8111-111111111111" }]);
  });

  it("remover chip volta o campo para vazio", async () => {
    const user = userEvent.setup();
    render(<EventItemsField sources={sources} />);
    await addLeite(user);
    await user.click(screen.getByRole("button", { name: "Remover Leite" }));
    expect(screen.queryByText("Leite · 1 l")).toBeNull();
    expect(hiddenItems()).toEqual([]);
  });

  it("o mesmo nome e unidade duas vezes soma num chip só", async () => {
    const user = userEvent.setup();
    render(<EventItemsField sources={sources} />);
    await addLeite(user);
    await addLeite(user);
    expect(screen.getAllByText(/^Leite · /)).toHaveLength(1);
    expect(screen.getByText("Leite · 2 l")).toBeInTheDocument();
  });

  it("Enter no campo adiciona o item e não envia o formulário do evento", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());
    render(<form onSubmit={onSubmit}><EventItemsField sources={sources} /></form>);
    await user.type(screen.getByLabelText("Produto do evento"), "detergente{Enter}");
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText("detergente · 1 un")).toBeInTheDocument();
  });

  it("nome vazio não adiciona", async () => {
    const user = userEvent.setup();
    render(<EventItemsField sources={sources} />);
    await user.click(screen.getByRole("button", { name: "Adicionar item" }));
    expect(hiddenItems()).toEqual([]);
  });

  it("mostra os itens que já estão na lista, com link para Compras", () => {
    render(
      <EventItemsField
        sources={sources}
        linked={[
          { id: "1", name: "Vinho", quantity: 2, unit: "un", is_purchased: false },
          { id: "2", name: "Pão", quantity: 1, unit: "un", is_purchased: true },
        ]}
      />,
    );
    expect(screen.getByText("Já na lista")).toBeInTheDocument();
    expect(screen.getByText(/Vinho/)).toBeInTheDocument();
    expect(screen.getByText(/Pão/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Ver na lista de compras/ })).toHaveAttribute("href", "/compras");
  });

  it("20 itens desabilita o campo com aviso", async () => {
    const user = userEvent.setup();
    render(<EventItemsField sources={sources} />);
    for (let i = 0; i < 20; i++) {
      await user.type(screen.getByLabelText("Produto do evento"), `Item ${i}{Enter}`);
    }
    expect(screen.getByText("No máximo 20 itens por evento.")).toBeInTheDocument();
    expect(screen.getByLabelText("Produto do evento")).toBeDisabled();
  });
});
