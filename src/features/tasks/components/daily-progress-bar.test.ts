import { describe, expect, it } from "vitest";
import type { OccurrenceWithTask } from "@/features/tasks/queries";
import { calcProgress } from "./daily-progress-bar";

const BASE_OCC: OccurrenceWithTask = {
  id: "00000000-0000-1000-8000-000000000001",
  task_id: "00000000-0000-1000-8000-000000000002",
  original_date: "2026-11-19",
  scheduled_for: "2026-11-19",
  status: "pending",
  completed_at: null,
  notes: null,
  task: {
    id: "00000000-0000-1000-8000-000000000002",
    title: "Teste",
    priority: "media",
    estimated_minutes: 10,
    room_id: null,
    status: "active",
  },
};

describe("calcProgress", () => {
  it("retorna { done: 0, total: 0 } para array vazio", () => {
    expect(calcProgress([])).toEqual({ done: 0, total: 0 });
  });

  it("conta 1 active pending como total=1, done=0", () => {
    expect(calcProgress([{ ...BASE_OCC, status: "pending" }])).toEqual({ done: 0, total: 1 });
  });

  it("conta 1 active completed como done=1, total=1", () => {
    expect(calcProgress([{ ...BASE_OCC, status: "completed" }])).toEqual({ done: 1, total: 1 });
  });

  it("exclui tarefa paused do total e do done", () => {
    expect(
      calcProgress([{ ...BASE_OCC, task: { ...BASE_OCC.task, status: "paused" } }]),
    ).toEqual({ done: 0, total: 0 });
  });

  it("1 active completed + 1 paused pending: done=1, total=1", () => {
    expect(
      calcProgress([
        { ...BASE_OCC, id: "00000000-0000-1000-8000-000000000001", status: "completed" },
        {
          ...BASE_OCC,
          id: "00000000-0000-1000-8000-000000000003",
          task: { ...BASE_OCC.task, status: "paused" },
        },
      ]),
    ).toEqual({ done: 1, total: 1 });
  });

  it("skipped nao entra no total", () => {
    expect(calcProgress([{ ...BASE_OCC, status: "skipped" }])).toEqual({ done: 0, total: 0 });
  });

  // RF2 (via calcProgress): 2 active completed = done===total
  it("RF2: 2 active completed resulta em done===total", () => {
    expect(
      calcProgress([
        { ...BASE_OCC, id: "00000000-0000-1000-8000-000000000004", status: "completed" },
        { ...BASE_OCC, id: "00000000-0000-1000-8000-000000000005", status: "completed" },
      ]),
    ).toEqual({ done: 2, total: 2 });
  });

  // RF4: só tarefas paused → total=0
  it("RF4: somente tarefas paused resulta em total=0", () => {
    expect(
      calcProgress([
        { ...BASE_OCC, task: { ...BASE_OCC.task, status: "paused" } },
        {
          ...BASE_OCC,
          id: "00000000-0000-1000-8000-000000000006",
          task: { ...BASE_OCC.task, status: "paused" },
        },
      ]),
    ).toEqual({ done: 0, total: 0 });
  });

  // RF2: coberto pelo hasMounted ref — não testável sem render
  // RF5: coberto pela lógica hasMounted + prevDone — testável apenas com RTL
});
