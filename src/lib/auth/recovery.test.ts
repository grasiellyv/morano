import { describe, expect, it } from "vitest";
import { isRecoverySession } from "./recovery";

const otp = [{ method: "otp", timestamp: 1 }];

describe("isRecoverySession", () => {
  it("aceita quando o cookie marca a mesma sessão", () => {
    expect(isRecoverySession({ sub: "u1", session_id: "s1", amr: otp }, "s1")).toBe(true);
  });

  it("aceita amr recovery (fluxo PKCE)", () => {
    expect(
      isRecoverySession({ sub: "u1", session_id: "s1", amr: [{ method: "recovery" }] }, undefined),
    ).toBe(true);
    expect(isRecoverySession({ sub: "u1", amr: ["recovery"] }, undefined)).toBe(true);
  });

  it("recusa sem cookie, com cookie de outra sessão ou sem usuário", () => {
    expect(isRecoverySession({ sub: "u1", session_id: "s1", amr: otp }, undefined)).toBe(false);
    expect(isRecoverySession({ sub: "u1", session_id: "s1", amr: otp }, "s2")).toBe(false);
    expect(isRecoverySession({ sub: "u1", amr: otp }, "")).toBe(false);
    expect(isRecoverySession(null, "s1")).toBe(false);
  });
});
