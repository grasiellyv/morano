import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const completeOccurrence = vi.fn();
const undoComplete = vi.fn();
vi.mock("@/features/tasks/actions", () => ({
  completeOccurrence: (...a: unknown[]) => completeOccurrence(...a),
  undoComplete: (...a: unknown[]) => undoComplete(...a),
  skipOccurrence: vi.fn(),
  postponeOccurrence: vi.fn(),
  claimOccurrence: vi.fn(),
  unclaimOccurrence: vi.fn(),
  updateOccurrenceNotes: vi.fn(),
}));
const toastError = vi.fn();
vi.mock("sonner", () => ({ toast: { error: (...a: unknown[]) => toastError(...a) } }));
vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}));

import { TaskOccurrenceRow } from "./task-occurrence-row";
import type { OccurrenceWithTask } from "@/features/tasks/queries";

const pending: OccurrenceWithTask = {
  id: "o1", task_id: "t1", original_date: "2026-11-23", scheduled_for: "2026-11-23", status: "pending",
  completed_at: null, assigned_to: null, notes: null,
  task: { id: "t1", title: "Lavar roupas", priority: "media", is_essential: false, instructions: null, room_id: null, rotation_id: null, status: "active", due_time: null },
} as OccurrenceWithTask;

beforeEach(() => {
  completeOccurrence.mockReset();
  undoComplete.mockReset();
  toastError.mockReset();
});

function deferred<T>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => { resolve = r; });
  return { promise, resolve };
}

describe("TaskOccurrenceRow — concluir com UI otimista", () => {
  it("avisa a tela na hora do clique (antes do servidor responder) e pede para não recarregar a página", async () => {
    const user = userEvent.setup();
    const d = deferred<{ status: "success" }>();
    completeOccurrence.mockReturnValue(d.promise);
    const onStatusChange = vi.fn();
    const onCompleted = vi.fn();
    render(<TaskOccurrenceRow occurrence={pending} today="2026-11-23" onStatusChange={onStatusChange} onCompleted={onCompleted} />);

    await user.click(screen.getByRole("button", { name: "Concluir: Lavar roupas" }));
    expect(onStatusChange).toHaveBeenCalledWith("o1", "completed");
    expect(onCompleted).not.toHaveBeenCalled(); // servidor ainda não respondeu

    await vi.waitFor(() => expect(completeOccurrence).toHaveBeenCalledTimes(1));
    const fd = completeOccurrence.mock.calls[0]![1] as FormData;
    expect(fd.get("occurrence_id")).toBe("o1");
    expect(fd.get("no_refresh")).toBe("1");

    d.resolve({ status: "success" });
    await vi.waitFor(() => expect(onCompleted).toHaveBeenCalledTimes(1));
    expect(onStatusChange).not.toHaveBeenCalledWith("o1", null);
  });

  it("erro do servidor desfaz a marcação e avisa", async () => {
    const user = userEvent.setup();
    completeOccurrence.mockResolvedValue({ status: "error", message: "Sem permissão para concluir tarefas." });
    const onStatusChange = vi.fn();
    render(<TaskOccurrenceRow occurrence={pending} today="2026-11-23" onStatusChange={onStatusChange} />);
    await user.click(screen.getByRole("button", { name: "Concluir: Lavar roupas" }));
    await vi.waitFor(() => expect(onStatusChange).toHaveBeenLastCalledWith("o1", null));
    expect(onStatusChange).toHaveBeenNthCalledWith(1, "o1", "completed");
    expect(toastError).toHaveBeenCalledWith("Sem permissão para concluir tarefas.");
  });

  it("falha inesperada (rede) também desfaz a marcação", async () => {
    const user = userEvent.setup();
    completeOccurrence.mockRejectedValue(new Error("rede"));
    const onStatusChange = vi.fn();
    render(<TaskOccurrenceRow occurrence={pending} today="2026-11-23" onStatusChange={onStatusChange} />);
    await user.click(screen.getByRole("button", { name: "Concluir: Lavar roupas" }));
    await vi.waitFor(() => expect(onStatusChange).toHaveBeenLastCalledWith("o1", null));
    expect(toastError).toHaveBeenCalled();
  });

  it("desfazer também é otimista e não recarrega a página", async () => {
    const user = userEvent.setup();
    const d = deferred<{ status: "success" }>();
    undoComplete.mockReturnValue(d.promise);
    const onStatusChange = vi.fn();
    const done = { ...pending, status: "completed" as const, completed_at: "2026-11-23T10:00:00Z" };
    render(<TaskOccurrenceRow occurrence={done} today="2026-11-23" onStatusChange={onStatusChange} />);
    await user.click(screen.getByRole("button", { name: "Desfazer conclusão: Lavar roupas" }));
    expect(onStatusChange).toHaveBeenCalledWith("o1", "pending");
    await vi.waitFor(() => expect(undoComplete).toHaveBeenCalledTimes(1));
    expect((undoComplete.mock.calls[0]![1] as FormData).get("no_refresh")).toBe("1");
    d.resolve({ status: "success" });
  });
});
