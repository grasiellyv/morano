import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/features/shopping/actions", () => ({
  addItem: vi.fn(), clearPurchased: vi.fn(), togglePurchased: vi.fn(), editItem: vi.fn(), deleteItem: vi.fn(),
}));
vi.mock("@/features/shopping/actions-categories", () => ({
  createCategory: vi.fn(), updateCategory: vi.fn(), deleteCategory: vi.fn(), reorderCategories: vi.fn(),
}));
vi.mock("@/features/shopping/actions-lists", () => ({
  createList: vi.fn(), updateList: vi.fn(), deleteList: vi.fn(), addListItem: vi.fn(),
  updateListItem: vi.fn(), deleteListItem: vi.fn(), applyList: vi.fn(),
}));
vi.mock("@/features/shopping/actions-share", () => ({ createShareLink: vi.fn(), revokeShareLink: vi.fn() }));
vi.mock("@/lib/supabase/client", () => ({ createClient: vi.fn() }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a>,
}));

import { ShoppingList } from "./shopping-list";
import type { ShoppingItem } from "@/features/shopping/queries";

const category = { id: "cat-ali", name: "Alimentação", icon: "apple" };
const leite: ShoppingItem = {
  id: "i1", name: "Leite", category_id: "cat-ali", category, notes: null, room_id: null, room: null,
  quantity: 1, unit: "un", is_purchased: false, purchased_at: null, created_at: "", updated_at: "",
  mission: "abastecimento", priority: "normal", created_by: null, added_by_name: "Pessoa",
  purchased_by: null, purchased_by_name: null, event: null,
};

function renderList() {
  return render(
    <ShoppingList
      pending={[leite]}
      purchased={[]}
      categories={[
        { id: "cat-ali", home_id: "h1", name: "Alimentação", icon: "apple", sort_order: 0, default_slug: "alimentacao" },
        { id: "cat-lim", home_id: "h1", name: "Limpeza", icon: "spray-can", sort_order: 1, default_slug: "limpeza" },
      ]}
      rooms={[]}
      lists={[]}
      members={[]}
      lastUpdatedAt={null}
      shareToken={null}
      canShare={false}
      history={[]}
    />,
  );
}

describe("ShoppingList", () => {
  it("busca explica que filtra a lista", () => {
    renderList();
    expect(screen.getByPlaceholderText("Buscar na lista…")).toBeInTheDocument();
    expect(screen.getByRole("searchbox", { name: "Buscar na lista" })).toBeInTheDocument();
  });

  it("botão de adicionar vem logo depois da busca e antes das categorias", () => {
    renderList();
    const search = screen.getByRole("searchbox");
    const add = screen.getByRole("button", { name: /Adicionar produto/ });
    const category = screen.getAllByText("Alimentação")[0]!;
    expect(search.compareDocumentPosition(add) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(add.compareDocumentPosition(category) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
