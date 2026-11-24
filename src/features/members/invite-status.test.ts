import { describe, expect, it } from "vitest";
import { effectiveInviteStatus, INVITE_STATUS_LABEL, splitInvites, type InviteRecord } from "./invite-status";

const now = new Date("2026-11-23T12:00:00Z");

function inv(id: string, status: InviteRecord["status"], created: string, expires = "2026-12-01T00:00:00Z"): InviteRecord {
  return { id, invited_email: `${id}@x.com`, role: "member", status, expires_at: expires, created_at: created };
}

describe("effectiveInviteStatus", () => {
  it("pendente vencido vira expirado", () =>
    expect(effectiveInviteStatus({ status: "pending", expires_at: "2026-11-23T11:59:59Z" }, now)).toBe("expired"));
  it("vence exatamente agora também é expirado", () =>
    expect(effectiveInviteStatus({ status: "pending", expires_at: "2026-11-23T12:00:00Z" }, now)).toBe("expired"));
  it("pendente no prazo continua pendente", () =>
    expect(effectiveInviteStatus({ status: "pending", expires_at: "2026-11-24T00:00:00Z" }, now)).toBe("pending"));
  it("aceito, revogado e expirado não mudam com a data", () => {
    expect(effectiveInviteStatus({ status: "accepted", expires_at: "2020-01-01T00:00:00Z" }, now)).toBe("accepted");
    expect(effectiveInviteStatus({ status: "revoked", expires_at: "2020-01-01T00:00:00Z" }, now)).toBe("revoked");
    expect(effectiveInviteStatus({ status: "expired", expires_at: "2099-01-01T00:00:00Z" }, now)).toBe("expired");
  });
});

describe("INVITE_STATUS_LABEL", () => {
  it("rótulos em português", () => {
    expect(INVITE_STATUS_LABEL).toEqual({ pending: "Pendente", accepted: "Aceito", revoked: "Revogado", expired: "Expirado" });
  });
});

describe("splitInvites", () => {
  const all = [
    inv("a", "pending", "2026-11-20T00:00:00Z"),
    inv("b", "pending", "2026-11-10T00:00:00Z", "2026-11-17T00:00:00Z"), // venceu
    inv("c", "accepted", "2026-11-15T00:00:00Z"),
    inv("d", "revoked", "2026-11-22T00:00:00Z"),
  ];

  it("separa vencidos para o histórico", () => {
    const { pending, history } = splitInvites(all, now);
    expect(pending.map((i) => i.id)).toEqual(["a"]);
    expect(history.map((i) => i.id)).toEqual(["d", "c", "b"]);
  });

  it("histórico mostra o status efetivo", () => {
    const { history } = splitInvites(all, now);
    expect(history.find((i) => i.id === "b")!.status).toBe("expired");
  });

  it("pendentes: mais recentes primeiro", () => {
    const { pending } = splitInvites([inv("x", "pending", "2026-11-01T00:00:00Z"), inv("y", "pending", "2026-11-05T00:00:00Z")], now);
    expect(pending.map((i) => i.id)).toEqual(["y", "x"]);
  });

  it("histórico limitado a 20", () => {
    const many = Array.from({ length: 25 }, (_, i) => inv(`r${i}`, "revoked", `2026-10-${String(i + 1).padStart(2, "0")}T00:00:00Z`));
    expect(splitInvites(many, now).history).toHaveLength(20);
  });

  it("lista vazia", () => expect(splitInvites([], now)).toEqual({ pending: [], history: [] }));
});
