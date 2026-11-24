import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ usePathname: () => "/inicio" }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a>,
}));
vi.mock("@/components/layout/sidebar", () => ({ Sidebar: () => null }));

import { AppShell } from "./app-shell";

describe("AppShell — área segura do iPhone", () => {
  it("o conteúdo começa abaixo do relógio/entalhe (safe-area-inset-top) no celular", () => {
    render(<AppShell><p>conteúdo</p></AppShell>);
    const main = screen.getByRole("main");
    // viewport-fit=cover faz a página ocupar a tela toda: sem isso o título fica sob a barra de status
    expect(main.className).toContain("env(safe-area-inset-top)");
  });

  it("e também respeita as laterais (modo paisagem)", () => {
    render(<AppShell><p>x</p></AppShell>);
    expect(screen.getByRole("main").className).toMatch(/safe-area-inset-left/);
    expect(screen.getByRole("main").className).toMatch(/safe-area-inset-right/);
  });
});
