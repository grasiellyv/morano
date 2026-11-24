import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a>,
}));

import { NotificationBell } from "./notification-bell";
import type { NotificationItem } from "./seen";

const items: NotificationItem[] = [
  { key: "t-1", href: "/rotina/ocorrencia/1", title: "Lavar roupas", meta: "Era para ontem", badge: "Atrasada", tone: "warn" },
];

beforeEach(() => localStorage.clear());

describe("NotificationBell", () => {
  it("abre a central, lista os itens e limpa o ponto", async () => {
    const user = userEvent.setup();
    render(<NotificationBell homeId="h1" items={items} />);
    await user.click(screen.getByRole("button", { name: /Notificações, 1 nova/ }));
    expect(screen.getByRole("dialog", { name: "Notificações" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Lavar roupas/ })).toHaveAttribute("href", "/rotina/ocorrencia/1");
    expect(JSON.parse(localStorage.getItem("morano:notificacoes:vistas:h1")!)).toEqual(["t-1"]);
    await user.keyboard("{Escape}");
    expect(screen.getByRole("button", { name: "Notificações" })).toBeInTheDocument();
  });

  it("item novo depois da abertura volta a marcar", () => {
    localStorage.setItem("morano:notificacoes:vistas:h1", JSON.stringify(["t-1"]));
    render(<NotificationBell homeId="h1" items={[...items, { ...items[0]!, key: "m-2", title: "Filtro" }]} />);
    expect(screen.getByRole("button", { name: /1 nova/ })).toBeInTheDocument();
  });

  it("itens já vistos não marcam", () => {
    localStorage.setItem("morano:notificacoes:vistas:h1", JSON.stringify(["t-1"]));
    render(<NotificationBell homeId="h1" items={items} />);
    expect(screen.getByRole("button", { name: "Notificações" })).toBeInTheDocument();
  });

  it("armazenamento corrompido não quebra", () => {
    localStorage.setItem("morano:notificacoes:vistas:h1", "{não é json");
    render(<NotificationBell homeId="h1" items={items} />);
    expect(screen.getByRole("button", { name: /1 nova/ })).toBeInTheDocument();
  });

  it("sem itens mostra estado vazio", async () => {
    const user = userEvent.setup();
    render(<NotificationBell homeId="h1" items={[]} />);
    await user.click(screen.getByRole("button", { name: "Notificações" }));
    expect(screen.getByText("Nada pedindo atenção agora.")).toBeInTheDocument();
  });
});
