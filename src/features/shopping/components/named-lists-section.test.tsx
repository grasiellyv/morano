import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const createList = vi.fn();
const updateList = vi.fn();
const applyList = vi.fn();
vi.mock("@/features/shopping/actions-lists", () => ({
  createList: (...a: unknown[]) => createList(...a),
  updateList: (...a: unknown[]) => updateList(...a),
  deleteList: vi.fn(),
  addListItem: vi.fn(),
  updateListItem: vi.fn(),
  deleteListItem: vi.fn(),
  applyList: (...a: unknown[]) => applyList(...a),
}));

import { NamedListsSection } from "./named-lists-section";
import type { ShoppingList } from "@/features/shopping/queries-lists";
import type { ShoppingCategory } from "@/features/shopping/queries-categories";

const categories: ShoppingCategory[] = [
  { id: "c-ali", home_id: "h", name: "Alimentação", icon: "apple", sort_order: 0, default_slug: "alimentacao" },
  { id: "c-lim", home_id: "h", name: "Limpeza", icon: "spray-can", sort_order: 1, default_slug: "limpeza" },
];

const churrasco: ShoppingList = {
  id: "l1",
  home_id: "h",
  name: "Churrasco",
  created_at: "2026-11-20T00:00:00Z",
  mission: "ocasioes",
  category_id: "c-ali",
  category: { id: "c-ali", name: "Alimentação", icon: "apple" },
  items: [
    { id: "i1", list_id: "l1", name: "Carvão", category_id: null, category: null, quantity: 2, unit: "kg", notes: null, reorder_months: null, last_added_at: null },
    { id: "i2", list_id: "l1", name: "Cerveja", category_id: null, category: null, quantity: 12, unit: "un", notes: null, reorder_months: null, last_added_at: null },
  ],
};

beforeEach(() => {
  createList.mockReset().mockResolvedValue({ status: "success", message: "Lista criada." });
  updateList.mockReset().mockResolvedValue({ status: "success", message: "Lista atualizada." });
  applyList.mockReset().mockResolvedValue({ status: "success", message: "2 itens adicionados." });
});

describe("NamedListsSection — listas inteligentes", () => {
  it("mostra o nome, a contagem e os vínculos (missão e categoria)", () => {
    render(<NamedListsSection lists={[churrasco]} categories={categories} />);
    expect(screen.getByRole("heading", { name: "Listas inteligentes" })).toBeInTheDocument();
    const card = screen.getByText("Churrasco").closest("details")!;
    expect(within(card).getByText("2 itens")).toBeInTheDocument();
    expect(within(card).getByText("Ocasiões")).toBeInTheDocument();
    expect(within(card).getAllByText("Alimentação").length).toBeGreaterThan(0);
  });

  it("estado vazio explica para que servem", () => {
    render(<NamedListsSection lists={[]} categories={categories} />);
    expect(screen.getByText(/Nenhuma lista inteligente/)).toBeInTheDocument();
  });

  it("um toque joga os itens para a lista ativa (applyList com o id) e mostra o resultado", async () => {
    const user = userEvent.setup();
    render(<NamedListsSection lists={[churrasco]} categories={categories} />);
    const card = screen.getByText("Churrasco").closest("details")!;
    await user.click(within(card).getByRole("button", { name: /Adicionar à lista de compras/ }));
    expect(applyList).toHaveBeenCalledTimes(1);
    const fd = applyList.mock.calls[0]![1] as FormData;
    expect(fd.get("list_id")).toBe("l1");
    expect(await screen.findByText("2 itens adicionados.")).toBeInTheDocument();
  });

  it("criar: nome, missão e categoria vão juntos", async () => {
    const user = userEvent.setup();
    render(<NamedListsSection lists={[]} categories={categories} />);
    await user.click(screen.getByRole("button", { name: "Nova lista" }));
    await user.type(screen.getByLabelText("Nome da nova lista"), "Compras do mês");
    await user.selectOptions(screen.getByLabelText("Missão ou ocasião"), "abastecimento");
    await user.selectOptions(screen.getByLabelText("Categoria padrão"), "c-lim");
    await user.click(screen.getByRole("button", { name: "Criar lista" }));
    await vi.waitFor(() => expect(createList).toHaveBeenCalledTimes(1));
    const fd = createList.mock.calls[0]![1] as FormData;
    expect(fd.get("name")).toBe("Compras do mês");
    expect(fd.get("mission")).toBe("abastecimento");
    expect(fd.get("category_id")).toBe("c-lim");
  });

  it("editar: renomear e trocar missão/categoria; os valores atuais já vêm preenchidos", async () => {
    const user = userEvent.setup();
    render(<NamedListsSection lists={[churrasco]} categories={categories} />);
    const card = screen.getByText("Churrasco").closest("details")!;
    await user.click(within(card).getByRole("button", { name: "Editar lista" }));
    expect(within(card).getByLabelText("Nome da lista")).toHaveValue("Churrasco");
    expect(within(card).getByLabelText("Missão ou ocasião")).toHaveValue("ocasioes");
    expect(within(card).getByLabelText("Categoria padrão")).toHaveValue("c-ali");

    await user.clear(within(card).getByLabelText("Nome da lista"));
    await user.type(within(card).getByLabelText("Nome da lista"), "Churrasco de domingo");
    await user.selectOptions(within(card).getByLabelText("Missão ou ocasião"), "");
    await user.click(within(card).getByRole("button", { name: "Salvar" }));
    await vi.waitFor(() => expect(updateList).toHaveBeenCalledTimes(1));
    const fd = updateList.mock.calls[0]![1] as FormData;
    expect(fd.get("id")).toBe("l1");
    expect(fd.get("name")).toBe("Churrasco de domingo");
    expect(fd.get("mission")).toBe("");
    expect(fd.get("category_id")).toBe("c-ali");
  });
});
