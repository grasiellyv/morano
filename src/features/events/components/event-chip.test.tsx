import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EventChip } from "./event-chip";
import type { Event } from "@/features/events/queries";

const base: Event = {
  id: "e1", home_id: "h1", title: "Teste", event_type: "visita", start_date: "2026-11-23",
  end_date: null, start_time: "22:00:00", end_time: null, description: null, created_at: "",
};

describe("EventChip", () => {
  it("mostra o horário sem segundos", () => {
    render(<EventChip event={base} />);
    expect(screen.getByText("22:00")).toBeInTheDocument();
    expect(screen.queryByText("22:00:00")).toBeNull();
  });

  it("sem horário não mostra nada de hora", () => {
    const { container } = render(<EventChip event={{ ...base, start_time: null }} />);
    expect(container.textContent).not.toMatch(/\d{2}:\d{2}|null/);
  });

  it("selo Evento só aparece quando pedido", () => {
    const { rerender } = render(<EventChip event={base} />);
    expect(screen.queryByText("Evento")).toBeNull();
    rerender(<EventChip event={base} showKindTag />);
    expect(screen.getByText("Evento")).toBeInTheDocument();
  });
});
