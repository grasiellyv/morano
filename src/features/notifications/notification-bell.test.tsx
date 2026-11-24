import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a>,
}));

import { NotificationBell } from "./notification-bell";

describe("NotificationBell", () => {
  it("sem não lidas: link simples, sem badge", () => {
    render(<NotificationBell unreadCount={0} />);
    const link = screen.getByRole("link", { name: "Notificações" });
    expect(link).toHaveAttribute("href", "/notificacoes");
  });

  it("com não lidas: aria-label indica contagem", () => {
    render(<NotificationBell unreadCount={3} />);
    expect(screen.getByRole("link", { name: "Notificações, 3 novas" })).toBeInTheDocument();
  });

  it("1 não lida usa singular", () => {
    render(<NotificationBell unreadCount={1} />);
    expect(screen.getByRole("link", { name: "Notificações, 1 nova" })).toBeInTheDocument();
  });
});
