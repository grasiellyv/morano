import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("sonner", () => ({ toast: vi.fn() }));
vi.mock("@/features/shopping/actions-suggest", () => ({ loadProductSources: vi.fn().mockResolvedValue({ categories: [], home: [] }) }));
vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}));

import { EventForm } from "./event-form";
import type { Event } from "@/features/events/queries";

const event: Event = {
  id: "e1", home_id: "h1", title: "Visita Teste", event_type: "visita", start_date: "2026-12-01",
  end_date: null, start_time: "22:00:00", end_time: null, description: null, created_at: "",
};
const noop = async () => ({ status: "idle" as const });

describe("EventForm — itens de compras", () => {
  it("sem permissão de Compras a seção não aparece (nem para tentar e falhar depois)", () => {
    render(<EventForm mode="create" createAction={noop} />);
    expect(screen.queryByText("Itens / Compras necessárias")).toBeNull();
    expect(screen.queryByLabelText("Produto do evento")).toBeNull();
  });

  it("sem permissão de Compras a exclusão continua avisando dos itens pendentes", async () => {
    const user = userEvent.setup();
    render(
      <EventForm
        mode="edit"
        initialValues={event}
        updateAction={noop}
        deleteAction={noop}
        linkedItems={[{ id: "1", name: "Vinho", quantity: 1, unit: "un", is_purchased: false }]}
      />,
    );
    expect(screen.queryByText("Itens / Compras necessárias")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Excluir" }));
    expect(await screen.findByText(/O 1 item pendente deste evento sai da lista de compras\./)).toBeInTheDocument();
  });

  it("com fontes a seção aparece antes da descrição", () => {
    render(<EventForm mode="create" createAction={noop} canAddItems />);
    const section = screen.getByText("Itens / Compras necessárias");
    const description = screen.getByLabelText(/Descrição/);
    expect(section.compareDocumentPosition(description) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("excluir avisa quantos itens pendentes saem da lista (comprados não contam)", async () => {
    const user = userEvent.setup();
    render(
      <EventForm
        mode="edit"
        initialValues={event}
        updateAction={noop}
        deleteAction={noop}
        canAddItems
        linkedItems={[
          { id: "1", name: "Vinho", quantity: 1, unit: "un", is_purchased: false },
          { id: "2", name: "Queijo", quantity: 1, unit: "un", is_purchased: false },
          { id: "3", name: "Pão", quantity: 1, unit: "un", is_purchased: true },
        ]}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Excluir" }));
    expect(await screen.findByText(/Os 2 itens pendentes deste evento saem da lista de compras\./)).toBeInTheDocument();
  });

  it("sem itens vinculados o texto de exclusão é o de antes", async () => {
    const user = userEvent.setup();
    render(<EventForm mode="edit" initialValues={event} updateAction={noop} deleteAction={noop} canAddItems />);
    await user.click(screen.getByRole("button", { name: "Excluir" }));
    expect(await screen.findByText('Excluir o evento "Visita Teste"?')).toBeInTheDocument();
  });

  it("erro de itens devolvido ao salvar aparece na seção (não falha em silêncio)", async () => {
    const user = userEvent.setup();
    const failing = async () => ({
      status: "error" as const,
      fieldErrors: { items: "Itens inválidos. Confira nome, quantidade e unidade." },
    });
    render(<EventForm mode="create" createAction={failing} canAddItems initialValues={{ start_date: "2026-12-01" }} />);
    await user.type(screen.getByLabelText("Nome"), "Festa");
    await user.click(screen.getByRole("button", { name: "Criar evento" }));
    expect(await screen.findByText("Itens inválidos. Confira nome, quantidade e unidade.")).toBeInTheDocument();
  });

  it("duplo envio (duplo clique/Enter repetido) executa a action uma vez só e desabilita o botão", async () => {
    const create = vi.fn(
      () => new Promise<{ status: "success"; message: string }>((r) => setTimeout(() => r({ status: "success", message: "Evento criado." }), 60)),
    );
    render(<EventForm mode="create" createAction={create} canAddItems initialValues={{ start_date: "2026-12-01" }} />);
    const form = document.getElementById("event-main-form")!;
    fireEvent.submit(form);
    fireEvent.submit(form);
    fireEvent.submit(form);
    expect(await screen.findByRole("button", { name: "Salvando…" })).toBeDisabled();
    await new Promise((r) => setTimeout(r, 200));
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("depois de terminar o envio, um novo envio volta a funcionar (edição com erro de validação)", async () => {
    const update = vi.fn().mockResolvedValue({ status: "error", fieldErrors: { title: "Título obrigatório" } });
    render(<EventForm mode="edit" initialValues={event} updateAction={update} deleteAction={noop} canAddItems />);
    const form = document.getElementById("event-main-form")!;
    fireEvent.submit(form);
    await vi.waitFor(() => expect(update).toHaveBeenCalledTimes(1));
    await screen.findByText("Título obrigatório");
    fireEvent.submit(form);
    await vi.waitFor(() => expect(update).toHaveBeenCalledTimes(2));
  });
});
