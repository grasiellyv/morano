import { describe, expect, it } from "vitest";
import type { OccurrenceWithTask } from "@/features/tasks/queries";
import { applyStatusOverrides, describeRecurrence, eventCovers, groupEventsByDay, groupWeekByCategory, periodOf, summarizeWeek } from "./rotina-format";

function occ(id: string, taskId: string, date: string, status: OccurrenceWithTask["status"], room: string | null, time: string | null = null): OccurrenceWithTask {
  return {
    id, task_id: taskId, original_date: date, scheduled_for: date, status,
    completed_at: null, assigned_to: null, notes: null,
    task: { id: taskId, title: `T-${taskId}`, priority: "media", is_essential: false, instructions: null, room_id: room, rotation_id: null, status: "active", due_time: time },
  };
}

describe("periodOf", () => {
  it("classifica manhã, tarde, noite e sem horário", () => {
    expect(periodOf("09:00:00")).toBe("manha");
    expect(periodOf("12:00")).toBe("tarde");
    expect(periodOf("18:30")).toBe("noite");
    expect(periodOf("02:00")).toBe("noite");
    expect(periodOf(null)).toBe("livre");
  });
});

describe("groupWeekByCategory", () => {
  const rooms = [{ id: "r1", name: "Cozinha" }, { id: "r2", name: "Banheiro" }];

  it("gera uma linha por tarefa, não por ocorrência", () => {
    const g = groupWeekByCategory([
      occ("a", "t1", "2026-11-23", "completed", "r1"),
      occ("b", "t1", "2026-11-24", "pending", "r1"),
      occ("c", "t1", "2026-11-25", "pending", "r1"),
    ], rooms);
    expect(g).toHaveLength(1);
    expect(g[0]!.tasks).toHaveLength(1);
    expect(g[0]!.tasks[0]!.total).toBe(3);
    expect(g[0]!.tasks[0]!.done).toBe(1);
  });

  it("ignora puladas, manda sem cômodo para Geral e categorias concluídas para o fim", () => {
    const g = groupWeekByCategory([
      occ("a", "t1", "2026-11-23", "completed", "r1"),
      occ("b", "t2", "2026-11-23", "pending", "r2"),
      occ("c", "t3", "2026-11-23", "pending", null),
      occ("d", "t2", "2026-11-24", "skipped", "r2"),
    ], rooms);
    expect(g.map((x) => x.name)).toEqual(["Banheiro", "Geral", "Cozinha"]);
    expect(g[0]!.total).toBe(1);
  });
});

describe("summarizeWeek", () => {
  it("separa concluídas, pendentes e futuras", () => {
    const s = summarizeWeek([
      occ("a", "t1", "2026-11-23", "completed", null),
      occ("b", "t1", "2026-11-23", "missed", null),
      occ("c", "t1", "2026-11-25", "pending", null),
      occ("d", "t1", "2026-11-24", "skipped", null),
    ], ["2026-11-23", "2026-11-24", "2026-11-25"], "2026-11-23");
    expect(s).toMatchObject({ planned: 3, done: 1, pending: 1, future: 1 });
  });
});


describe("describeRecurrence", () => {
  const base = { interval_value: null, interval_unit: null, weekdays: null, month_day: null, start_date: "2026-11-23" } as const;
  it("descreve as frequências", () => {
    expect(describeRecurrence({ ...base, frequency_type: "weekly" })).toBe("Toda segunda-feira");
    expect(describeRecurrence({ ...base, frequency_type: "weekly", weekdays: [4, 1] })).toBe("Às segundas e quintas");
    expect(describeRecurrence({ ...base, frequency_type: "weekly", weekdays: [6] })).toBe("Todo sábado");
    expect(describeRecurrence({ ...base, frequency_type: "daily" })).toBe("Todo dia");
    expect(describeRecurrence({ ...base, frequency_type: "monthly", month_day: 15 })).toBe("Todo dia 15 do mês");
    expect(describeRecurrence({ ...base, frequency_type: "custom", interval_value: 3, interval_unit: "day" })).toBe("A cada 3 dias");
    expect(describeRecurrence(null)).toBe("Só uma vez");
  });
});

const WEEK = ["2026-11-23", "2026-11-24", "2026-11-25", "2026-11-26", "2026-11-27", "2026-11-28", "2026-11-29"];
const ev = (title: string, start_date: string, end_date: string | null = null, start_time: string | null = null) =>
  ({ title, start_date, end_date, start_time });

describe("eventCovers", () => {
  it("evento de um dia cobre só o próprio dia", () => {
    expect(eventCovers(ev("x", "2026-11-25"), "2026-11-25")).toBe(true);
    expect(eventCovers(ev("x", "2026-11-25"), "2026-11-26")).toBe(false);
  });
  it("evento de vários dias cobre o intervalo inclusive", () => {
    expect(eventCovers(ev("x", "2026-11-25", "2026-11-27"), "2026-11-27")).toBe(true);
    expect(eventCovers(ev("x", "2026-11-25", "2026-11-27"), "2026-11-28")).toBe(false);
  });
});

describe("groupEventsByDay", () => {
  it("agrupa por dia, ordena por horário e ignora dias vazios", () => {
    const r = groupEventsByDay([ev("Jantar", "2026-11-25", null, "20:00:00"), ev("Visita", "2026-11-25", null, "09:00:00")], WEEK);
    expect(r).toEqual([
      { date: "2026-11-25", events: [expect.objectContaining({ title: "Visita" }), expect.objectContaining({ title: "Jantar" })] },
    ]);
  });
  it("evento de vários dias aparece só nos dias desta semana", () => {
    const r = groupEventsByDay([ev("Viagem", "2026-11-27", "2026-12-01")], WEEK);
    expect(r.map((d) => d.date)).toEqual(["2026-11-27", "2026-11-28", "2026-11-29"]);
  });
  it("evento que começou na semana anterior também aparece", () => {
    expect(groupEventsByDay([ev("Obra", "2026-11-20", "2026-11-24")], WEEK).map((d) => d.date)).toEqual(["2026-11-23", "2026-11-24"]);
  });
  it("sem eventos devolve lista vazia", () => {
    expect(groupEventsByDay([], WEEK)).toEqual([]);
  });
});

describe("applyStatusOverrides", () => {
  const a = occ("o1", "t1", "2026-11-23", "pending", null);
  const b = occ("o2", "t2", "2026-11-23", "pending", null);

  it("sem overrides devolve a própria lista (sem recriar nada)", () => {
    const list = [a, b];
    expect(applyStatusOverrides(list, {})).toBe(list);
  });

  it("marca só as ocorrências sobrescritas e preserva a identidade das demais", () => {
    const r = applyStatusOverrides([a, b], { o1: "completed" });
    expect(r[0]!.status).toBe("completed");
    expect(r[0]!.completed_at).not.toBeNull();
    expect(r[1]).toBe(b);
  });

  it("desfazer: concluída volta a pendente e perde completed_at", () => {
    const done = { ...a, status: "completed" as const, completed_at: "2026-11-23T10:00:00Z" };
    const r = applyStatusOverrides([done], { o1: "pending" });
    expect(r[0]!.status).toBe("pending");
    expect(r[0]!.completed_at).toBeNull();
  });

  it("override de id que não está na lista é ignorado", () => {
    expect(applyStatusOverrides([a], { zzz: "completed" })).toEqual([a]);
  });

  it("pulada some da lista (não é pendente nem concluída) e as demais mantêm a identidade", () => {
    const r = applyStatusOverrides([a, b], { o1: "skipped" });
    expect(r.map((o) => o.id)).toEqual(["o2"]);
    expect(r[0]).toBe(b);
  });
});
