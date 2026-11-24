import { describe, expect, it } from "vitest";
import { MAX_EVENT_ITEMS, parseEventItems, pendingCountText, summarizeEventItemResults } from "./event-items";

const item = (name: string, quantity = 1, unit = "un") => ({ name, quantity, unit, category_id: null });

describe("parseEventItems", () => {
  it("vazio ou ausente vira lista vazia", () => {
    expect(parseEventItems("")).toEqual({ ok: true, items: [] });
    expect(parseEventItems(null)).toEqual({ ok: true, items: [] });
    expect(parseEventItems(undefined)).toEqual({ ok: true, items: [] });
  });

  it("rejeita mais de 20 itens", () => {
    const raw = JSON.stringify(Array.from({ length: MAX_EVENT_ITEMS + 1 }, (_, i) => item(`Item ${i}`)));
    expect(parseEventItems(raw)).toEqual({ ok: false, message: "No máximo 20 itens por evento." });
  });

  it("aceita exatamente 20", () => {
    const raw = JSON.stringify(Array.from({ length: MAX_EVENT_ITEMS }, (_, i) => item(`Item ${i}`)));
    expect(parseEventItems(raw).ok).toBe(true);
  });

  it("rejeita JSON inválido, não-lista e item sem nome", () => {
    expect(parseEventItems("{x").ok).toBe(false);
    expect(parseEventItems('{"a":1}').ok).toBe(false);
    expect(parseEventItems(JSON.stringify([item(" ")])).ok).toBe(false);
  });

  it("rejeita quantidade zero, negativa ou unidade inventada", () => {
    expect(parseEventItems(JSON.stringify([item("Leite", 0)])).ok).toBe(false);
    expect(parseEventItems(JSON.stringify([item("Leite", -1)])).ok).toBe(false);
    expect(parseEventItems(JSON.stringify([item("Leite", 1, "frasco")])).ok).toBe(false);
  });

  it("funde nomes repetidos (acento/caixa) de mesma unidade", () => {
    const r = parseEventItems(JSON.stringify([item("Leite", 1, "l"), item("leite ", 2, "l"), item("Açúcar", 1, "kg"), item("acucar", 1, "kg")]));
    expect(r).toEqual({
      ok: true,
      items: [
        { name: "Leite", quantity: 3, unit: "l", category_id: null },
        { name: "Açúcar", quantity: 2, unit: "kg", category_id: null },
      ],
    });
  });

  it("mesmo nome com unidades diferentes continua separado", () => {
    const r = parseEventItems(JSON.stringify([item("Leite", 1, "l"), item("Leite", 1, "caixa")]));
    expect(r.ok && r.items).toHaveLength(2);
  });

  it("category_id vazio vira null", () => {
    const r = parseEventItems(JSON.stringify([{ name: "Leite", quantity: 1, unit: "un", category_id: "" }]));
    expect(r.ok && r.items[0]!.category_id).toBeNull();
  });
});

describe("summarizeEventItemResults", () => {
  it("falha parcial: evento salvo e itens que não entraram listados", () => {
    const msg = summarizeEventItemResults("criado", [
      { name: "Leite", result: { result: "inserted", id: "00000000-0000-0000-0000-000000000001" } },
      { name: "Café", result: { result: "error", forbidden: true } },
      { name: "Pão", result: { result: "conflict", name: "Pão", quantity: 2, unit: "pacote" } },
    ]);
    expect(msg).toContain("Evento criado.");
    expect(msg).toContain("Café");
    expect(msg).toContain("sem permissão para Compras");
    expect(msg).toContain("Pão");
    expect(msg).not.toContain("Leite");
  });

  it("tudo certo não acrescenta aviso", () => {
    expect(
      summarizeEventItemResults("atualizado", [
        { name: "Leite", result: { result: "inserted", id: "00000000-0000-0000-0000-000000000001" } },
      ]),
    ).toBe("Evento atualizado.");
    expect(summarizeEventItemResults("criado", [])).toBe("Evento criado.");
  });

  it("item já vinculado ao evento (reenvio) não vira erro nem soma: só é informado", () => {
    const msg = summarizeEventItemResults("atualizado", [
      { name: "Leite", result: { result: "unchanged", name: "Leite", quantity: 1, unit: "un" } },
    ]);
    expect(msg).toBe("Evento atualizado. Leite já estava na lista deste evento.");
  });

  it("item somado a um que já existia é informado", () => {
    const msg = summarizeEventItemResults("criado", [
      { name: "Leite", result: { result: "merged", name: "Leite", quantity: 3, unit: "un" } },
    ]);
    expect(msg).toContain("Leite");
    expect(msg).toContain("já estava na lista");
  });
});

describe("pendingCountText", () => {
  it("sem pendentes não avisa", () => expect(pendingCountText(0)).toBeNull());
  it("singular", () => expect(pendingCountText(1)).toBe("O 1 item pendente deste evento sai da lista de compras."));
  it("plural", () => expect(pendingCountText(3)).toBe("Os 3 itens pendentes deste evento saem da lista de compras."));
});
