import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("sonner", () => ({ toast: vi.fn() }));
vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}));

import { EventForm } from "./event-form";
import type { Event } from "@/features/events/queries";

const event: Event = {
  id: "e1", home_id: "h1", title: "Visita Teste", event_type: "visita", start_date: "2026-12-01",
  end_date: null, start_time: "22:00:00", end_time: null, description: null, created_at: "",
};
const sources = { home: [], categories: [] };
const noop = async () => ({ status: "idle" as const });

describe("EventForm — itens de compras", () => {
  it("sem fontes de produtos a seção não aparece", () => {
    render(<EventForm mode="create" createAction={noop} />);
    expect(screen.queryByText("Itens / Compras necessárias")).toBeNull();
  });

  it("com fontes a seção aparece antes da descrição", () => {
    render(<EventForm mode="create" createAction={noop} productSources={sources} />);
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
        productSources={sources}
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
    render(<EventForm mode="edit" initialValues={event} updateAction={noop} deleteAction={noop} productSources={sources} />);
    await user.click(screen.getByRole("button", { name: "Excluir" }));
    expect(await screen.findByText('Excluir o evento "Visita Teste"?')).toBeInTheDocument();
  });
});
