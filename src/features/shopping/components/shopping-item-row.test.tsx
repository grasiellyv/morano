import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/features/shopping/actions", () => ({ togglePurchased: vi.fn(), editItem: vi.fn(), deleteItem: vi.fn() }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { ShoppingItemRow } from "./shopping-item-row";
import type { ShoppingItem } from "@/features/shopping/queries";

const item: ShoppingItem = {
  id: "i1", name: "Leite de Amêndoas", category_id: null, category: null, notes: null, room_id: null, room: null,
  quantity: 1, unit: "un", is_purchased: false, purchased_at: null, created_at: "", updated_at: "",
  mission: "ocasioes", priority: "normal", created_by: null, added_by_name: "Pessoa",
  purchased_by: null, purchased_by_name: null, event: null,
};

describe("ShoppingItemRow — vínculo com evento", () => {
  it("mostra o selo com o título do evento", () => {
    render(<ShoppingItemRow item={{ ...item, event: { id: "e1", title: "Visita Teste" } }} categories={[]} />);
    expect(screen.getByLabelText("Vinculado a: Visita Teste")).toHaveTextContent("Visita Teste");
  });

  it("sem evento não mostra selo", () => {
    render(<ShoppingItemRow item={item} categories={[]} />);
    expect(screen.queryByLabelText(/Vinculado a/)).toBeNull();
  });
});
