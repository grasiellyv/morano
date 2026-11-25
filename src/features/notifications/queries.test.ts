import { describe, expect, it } from "vitest";
import { selectOccurrencesNeedingNotification } from "./queries";

describe("selectOccurrencesNeedingNotification", () => {
  it("mantém ocorrências sem notificação existente", () => {
    const occurrences = [{ id: "occ-1", scheduled_for: "2026-11-24" }];
    const result = selectOccurrencesNeedingNotification(occurrences, []);
    expect(result).toEqual(occurrences);
  });

  it("remove ocorrência cuja notificação (entity_id, occurs_on) já existe", () => {
    const occurrences = [{ id: "occ-1", scheduled_for: "2026-11-24" }];
    const existing = [{ entity_id: "occ-1", occurs_on: "2026-11-24" }];
    expect(selectOccurrencesNeedingNotification(occurrences, existing)).toEqual([]);
  });

  it("não basta o mesmo entity_id: occurs_on diferente ainda precisa de notificação (postergação)", () => {
    // postpone_task_occurrence atualiza scheduled_for na MESMA linha (mesmo
    // id/entity_id). Uma notificação antiga para o dia 1 não deve impedir a
    // notificação da ocorrência postergada para o dia 5 — a chave de
    // deduplicação é composta (entity_id, occurs_on), igual à constraint
    // notifications_due_today_once.
    const occurrences = [{ id: "occ-1", scheduled_for: "2026-11-28" }];
    const existing = [{ entity_id: "occ-1", occurs_on: "2026-11-24" }];
    expect(selectOccurrencesNeedingNotification(occurrences, existing)).toEqual(occurrences);
  });

  it("filtra apenas as ocorrências já notificadas, mantendo as demais", () => {
    const occurrences = [
      { id: "occ-1", scheduled_for: "2026-11-24" },
      { id: "occ-2", scheduled_for: "2026-11-23" },
      { id: "occ-3", scheduled_for: "2026-11-24" },
    ];
    const existing = [
      { entity_id: "occ-1", occurs_on: "2026-11-24" },
      { entity_id: "occ-3", occurs_on: "2026-11-20" }, // occurs_on diferente: não bate
    ];
    const result = selectOccurrencesNeedingNotification(occurrences, existing);
    expect(result.map((occ) => occ.id)).toEqual(["occ-2", "occ-3"]);
  });

  it("lista vazia de ocorrências retorna lista vazia", () => {
    expect(selectOccurrencesNeedingNotification([], [{ entity_id: "x", occurs_on: "2026-11-24" }])).toEqual(
      [],
    );
  });
});
