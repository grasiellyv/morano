import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/features/homes/actions", () => ({ addRoom: vi.fn(), updateRoom: vi.fn(), deleteRoom: vi.fn() }));

import { RoomList } from "./room-list";

describe("RoomList — hierarquia tipográfica", () => {
  it("o nome do cômodo tem mais destaque que o tipo (subtítulo)", () => {
    render(<RoomList rooms={[{ id: "1", name: "Varanda", room_type: "lavanderia", position: 0 }]} />);
    const name = screen.getByText("Varanda");
    const subtitle = screen.getByText("Lavanderia");
    expect(name.className).toContain("text-base");
    expect(name.className).toContain("font-medium");
    expect(subtitle.className).toContain("text-xs");
  });
});
