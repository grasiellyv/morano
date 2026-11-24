import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const addItem = vi.fn();
const createList = vi.fn();
vi.mock("@/features/shopping/actions", () => ({ addItem: (...a: unknown[]) => addItem(...a) }));
vi.mock("@/features/shopping/actions-lists", () => ({ createList: (...a: unknown[]) => createList(...a) }));
const toastSuccess = vi.fn();
vi.mock("sonner", () => ({ toast: { success: (...a: unknown[]) => toastSuccess(...a), error: vi.fn() } }));

import { HistoryRecover } from "./history-recover";
import type { HistoryProduct } from "@/features/shopping/dedupe";
import type { ShoppingCategory } from "@/features/shopping/queries-categories";

const categories: ShoppingCategory[] = [
  { id: "c-ali", home_id: "h", name: "Alimentação", icon: "apple", sort_order: 0, default_slug: "alimentacao" },
];

const products: HistoryProduct[] = [
  { name: "Arroz", quantity: 5, unit: "kg", category_id: "c-ali", lastAt: "2026-11-20T00:00:00Z", times: 4 },
  { name: "Leite", quantity: 6, unit: "un", category_id: null, lastAt: "2026-11-21T00:00:00Z", times: 2 },
  { name: "Café", quantity: 1, unit: "un", category_id: null, lastAt: "2026-11-22T00:00:00Z", times: 1 },
];

beforeEach(() => {
  addItem.mockReset().mockResolvedValue({ status: "success", message: "Item adicionado." });
  createList.mockReset().mockResolvedValue({ status: "success", message: "Lista criada." });
  toastSuccess.mockReset();
});

async function open(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: /Mais pedidos/ }));
}

describe("HistoryRecover — Mais pedidos", () => {
  it("mostra quantas vezes cada item foi comprado", async () => {
    const user = userEvent.setup();
    render(<HistoryRecover products={products} pendingNames={[]} categories={categories} />);
    await open(user);
    expect(screen.getByText(/comprado 4×/)).toBeInTheDocument();
    expect(screen.getByText(/comprado 1×/)).toBeInTheDocument();
  });

  it("continua dando para adicionar um item direto", async () => {
    const user = userEvent.setup();
    render(<HistoryRecover products={products} pendingNames={[]} categories={categories} />);
    await open(user);
    await user.click(screen.getByRole("button", { name: "Adicionar Arroz à lista" }));
    await vi.waitFor(() => expect(addItem).toHaveBeenCalledTimes(1));
    expect((addItem.mock.calls[0]![1] as FormData).get("name")).toBe("Arroz");
  });

  it("sem seleção não há botão de criar lista", async () => {
    const user = userEvent.setup();
    render(<HistoryRecover products={products} pendingNames={[]} categories={categories} />);
    await open(user);
    expect(screen.queryByRole("button", { name: /Criar lista inteligente/ })).toBeNull();
  });

  it("escolher itens e criar a lista inteligente com nome, missão e categoria", async () => {
    const user = userEvent.setup();
    render(<HistoryRecover products={products} pendingNames={[]} categories={categories} />);
    await open(user);
    await user.click(screen.getByRole("checkbox", { name: "Selecionar Arroz" }));
    await user.click(screen.getByRole("checkbox", { name: "Selecionar Leite" }));
    await user.click(screen.getByRole("button", { name: "Criar lista inteligente com 2 itens" }));

    await user.type(screen.getByLabelText("Nome da lista inteligente"), "Compras do mês");
    await user.selectOptions(screen.getByLabelText("Missão ou ocasião"), "abastecimento");
    await user.selectOptions(screen.getByLabelText("Categoria padrão"), "c-ali");
    await user.click(screen.getByRole("button", { name: "Criar lista" }));

    await vi.waitFor(() => expect(createList).toHaveBeenCalledTimes(1));
    const fd = createList.mock.calls[0]![1] as FormData;
    expect(fd.get("name")).toBe("Compras do mês");
    expect(fd.get("mission")).toBe("abastecimento");
    expect(fd.get("category_id")).toBe("c-ali");
    expect(JSON.parse(String(fd.get("items")))).toEqual([
      { name: "Arroz", quantity: 5, unit: "kg", category_id: "c-ali" },
      { name: "Leite", quantity: 6, unit: "un", category_id: null },
    ]);
    // sucesso: avisa e limpa a seleção
    await vi.waitFor(() => expect(toastSuccess).toHaveBeenCalled());
    expect(screen.queryByRole("button", { name: /Criar lista inteligente/ })).toBeNull();
    expect(screen.getByRole("checkbox", { name: "Selecionar Arroz" })).not.toBeChecked();
  });

  it("erro ao criar mantém a seleção e mostra a mensagem", async () => {
    const user = userEvent.setup();
    createList.mockResolvedValue({ status: "error", message: "Sem permissão para gerenciar compras." });
    render(<HistoryRecover products={products} pendingNames={[]} categories={categories} />);
    await open(user);
    await user.click(screen.getByRole("checkbox", { name: "Selecionar Café" }));
    await user.click(screen.getByRole("button", { name: "Criar lista inteligente com 1 item" }));
    await user.type(screen.getByLabelText("Nome da lista inteligente"), "Cafés");
    await user.click(screen.getByRole("button", { name: "Criar lista" }));
    expect(await screen.findByText("Sem permissão para gerenciar compras.")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Selecionar Café" })).toBeChecked();
  });
});
