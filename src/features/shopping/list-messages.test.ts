import { describe, expect, it } from "vitest";
import { applyListMessage } from "./list-messages";

describe("applyListMessage", () => {
  it("só adicionados", () => {
    expect(applyListMessage({ inserted: 3, merged: 0, conflict: 0 })).toBe("3 itens adicionados.");
    expect(applyListMessage({ inserted: 1, merged: 0, conflict: 0 })).toBe("1 item adicionado.");
  });
  it("somados ao que já estava na lista", () => {
    expect(applyListMessage({ inserted: 2, merged: 1, conflict: 0 })).toBe("2 itens adicionados; 1 já estava na lista (quantidade somada).");
    expect(applyListMessage({ inserted: 0, merged: 2, conflict: 0 })).toBe("0 itens adicionados; 2 já estavam na lista (quantidade somada).");
  });
  it("unidade diferente é avisado", () => {
    expect(applyListMessage({ inserted: 1, merged: 0, conflict: 2 })).toBe("1 item adicionado; 2 com unidade diferente foram ignorados.");
    expect(applyListMessage({ inserted: 1, merged: 0, conflict: 1 })).toBe("1 item adicionado; 1 com unidade diferente foi ignorado.");
  });
});
