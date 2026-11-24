import { describe, expect, it } from "vitest";
import { seenStorageKey, unseenKeys } from "./seen";

describe("unseenKeys", () => {
  it("só conta o que não estava na última abertura", () => {
    expect(unseenKeys(["a", "b", "c"], ["a", "b"])).toEqual(["c"]);
    expect(unseenKeys(["a"], ["a", "x"])).toEqual([]);
    expect(unseenKeys([], [])).toEqual([]);
  });
});

describe("seenStorageKey", () => {
  it("é por casa", () => {
    expect(seenStorageKey("h1")).toBe("morano:notificacoes:vistas:h1");
  });
});
