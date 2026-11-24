import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/features/shopping/actions", () => ({ addItem: vi.fn().mockResolvedValue({ status: "success" }) }));
vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}));

import { ShoppingShortcut } from "./shopping-shortcut";

const sources = {
  categories: [{ id: "cat-ali", default_slug: "alimentacao" }],
  home: [{ name: "Leite", category_id: "cat-ali", unit: "l" }],
};

async function openAndPick(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Adicionar à lista" }));
  await user.type(screen.getByRole("combobox"), "lei");
  await user.click(await screen.findByRole("option", { name: /^Leite\s?Já usado em casa$/ }));
  return new FormData(screen.getByRole("combobox").closest("form")!);
}

describe("ShoppingShortcut", () => {
  it("selecionar sugestão envia categoria e unidade", async () => {
    const user = userEvent.setup();
    render(<ShoppingShortcut taskTitle="Organizar cozinha" roomId={null} sources={sources} />);
    const fd = await openAndPick(user);
    expect(fd.get("name")).toBe("Leite");
    expect(fd.get("category_id")).toBe("cat-ali");
    expect(fd.get("unit")).toBe("l");
    expect(fd.get("notes")).toBe("Para: Organizar cozinha");
    expect(fd.get("mission")).toBe("reposicao");
  });

  it("digitar de novo depois de escolher descarta categoria e unidade", async () => {
    const user = userEvent.setup();
    render(<ShoppingShortcut taskTitle="Organizar cozinha" roomId={null} sources={sources} />);
    await openAndPick(user);
    await user.type(screen.getByRole("combobox"), "x");
    const fd = new FormData(screen.getByRole("combobox").closest("form")!);
    expect(fd.get("category_id")).toBeNull();
    expect(fd.get("unit")).toBeNull();
  });

  it("texto livre sem sugestão continua funcionando (placeholder do exemplo)", async () => {
    const user = userEvent.setup();
    render(<ShoppingShortcut taskTitle="Lavar" roomId="room-1" sources={sources} />);
    await user.click(screen.getByRole("button", { name: "Adicionar à lista" }));
    expect(screen.getByPlaceholderText("Ex.: detergente")).toBeInTheDocument();
    await user.type(screen.getByRole("combobox"), "detergente");
    const fd = new FormData(screen.getByRole("combobox").closest("form")!);
    expect(fd.get("name")).toBe("detergente");
    expect(fd.get("room_id")).toBe("room-1");
    expect(fd.get("category_id")).toBeNull();
  });
});
