import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/features/members/actions", () => ({
  removeMember: vi.fn(), transferOwnership: vi.fn(), inviteMember: vi.fn(), revokeInvite: vi.fn(),
}));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a>,
}));

import { MembersSections, resolveSection } from "./members-sections";
import type { HomeMember } from "@/features/members/queries";
import type { InviteRecord } from "@/features/members/invite-status";

const members: HomeMember[] = [
  { user_id: "u1", role: "owner", full_name: "Pessoa Teste", avatar_url: null, joined_at: "2026-01-01T00:00:00Z", absence_start: null, absence_end: null },
];
const invite = (id: string, status: InviteRecord["status"]): InviteRecord => ({
  id, invited_email: `${id}@x.com`, role: "member", status, expires_at: "2026-12-01T00:00:00Z", created_at: "2026-11-20T00:00:00Z",
});
const noop = vi.fn();

function renderSections(over: Partial<React.ComponentProps<typeof MembersSections>> = {}) {
  return render(
    <MembersSections
      members={members}
      currentUserId="u1"
      currentUserRole="owner"
      pending={[invite("p1", "pending"), invite("p2", "pending")]}
      history={[invite("h1", "revoked"), invite("h2", "accepted"), invite("h3", "expired")]}
      openSection={null}
      showInviteForm={false}
      inviteMemberAction={noop}
      revokeInviteAction={noop}
      {...over}
    />,
  );
}

describe("resolveSection", () => {
  it("usuário comum sempre cai em moradores", () => {
    expect(resolveSection("convites", false)).toBe("moradores");
    expect(resolveSection("historico", false)).toBe("moradores");
  });
  it("admin/dono: valores válidos passam", () => {
    expect(resolveSection("convites", true)).toBe("convites");
    expect(resolveSection("historico", true)).toBe("historico");
    expect(resolveSection("moradores", true)).toBe("moradores");
  });
  it("ausente ou inválido vira moradores", () => {
    expect(resolveSection(undefined, true)).toBe("moradores");
    expect(resolveSection("xyz", true)).toBe("moradores");
  });
});

describe("MembersSections", () => {
  it("admin vê as três seções com contadores", () => {
    renderSections();
    expect(screen.getByText("Moradores").closest("details")).toHaveTextContent("1");
    expect(screen.getByText("Convites pendentes").closest("details")).toHaveTextContent("2");
    expect(screen.getByText("Histórico de convites").closest("details")).toHaveTextContent("3");
  });

  it("membro comum vê só Moradores e nenhum dado de convite", () => {
    renderSections({ currentUserRole: "member", pending: [], history: [] });
    expect(screen.getByText("Moradores")).toBeInTheDocument();
    expect(screen.queryByText("Convites pendentes")).toBeNull();
    expect(screen.queryByText("Histórico de convites")).toBeNull();
    expect(screen.queryByText(/E-mail do convidado/)).toBeNull();
  });

  it("showInviteForm mostra o formulário de convite dentro da seção Convites", () => {
    renderSections({ showInviteForm: true, openSection: "convites" });
    const section = screen.getByText("Convites pendentes").closest("details")!;
    expect(within(section).getByLabelText("E-mail do convidado")).toBeInTheDocument();
  });

  it("sem showInviteForm há um link para abrir o formulário", () => {
    renderSections();
    expect(screen.getByRole("link", { name: /Novo convite/ })).toHaveAttribute("href", "/casa/membros?secao=convites&novo=1");
    expect(screen.queryByLabelText("E-mail do convidado")).toBeNull();
  });

  it("histórico mostra Revogado, Aceito e Expirado", () => {
    renderSections();
    const section = screen.getByText("Histórico de convites").closest("details")!;
    expect(within(section).getByText("Revogado")).toBeInTheDocument();
    expect(within(section).getByText("Aceito")).toBeInTheDocument();
    expect(within(section).getByText("Expirado")).toBeInTheDocument();
  });

  it("sem convites pendentes mostra estado vazio", () => {
    renderSections({ pending: [] });
    expect(screen.getByText("Nenhum convite pendente.")).toBeInTheDocument();
  });

  it("a seção pedida abre mesmo que o padrão seja fechada", () => {
    renderSections({ openSection: "historico" });
    expect(screen.getByText("Histórico de convites").closest("details")!.open).toBe(true);
    expect(screen.getByText("Convites pendentes").closest("details")!.open).toBe(false);
  });
});
