import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/features/shopping/actions", () => ({ addItem: vi.fn() }));
vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}));

import { AddItemForm } from "./add-item-form";

const categories = [
  { id: "cat-ali", home_id: "h", name: "Alimentação", icon: "apple", sort_order: 0, default_slug: "alimentacao" },
  { id: "cat-lim", home_id: "h", name: "Limpeza", icon: "spray-can", sort_order: 1, default_slug: "limpeza" },
];
const sources = { categories, home: [{ name: "Leite", category_id: "cat-ali", unit: "l" }] };

describe("AddItemForm — autocomplete", () => {
  it("escolher uma sugestão preenche nome, categoria e unidade", async () => {
    const user = userEvent.setup();
    render(<AddItemForm categories={categories} rooms={[]} sources={sources} />);
    await user.type(screen.getByLabelText("Nome do produto"), "lei");
    await user.click(await screen.findByRole("option", { name: /^Leite\s?Já usado em casa$/ }));
    expect(screen.getByLabelText("Nome do produto")).toHaveValue("Leite");
    expect(screen.getByLabelText("Unidade")).toHaveValue("l");
    expect(screen.getByRole("radio", { name: /Alimentação/ })).toHaveAttribute("aria-checked", "true");
  });

  it("acha o produto sem acento (regressão: acucar → Açúcar)", async () => {
    const user = userEvent.setup();
    render(<AddItemForm categories={categories} rooms={[]} sources={{ categories, home: [] }} />);
    await user.type(screen.getByLabelText("Nome do produto"), "acucar");
    expect(await screen.findByRole("option", { name: "Açúcar" })).toBeInTheDocument();
  });
});
