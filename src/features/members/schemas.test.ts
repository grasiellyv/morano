import { describe, it, expect } from "vitest";
import {
  inviteMemberSchema,
  revokeInviteSchema,
  removeMemberSchema,
  transferOwnershipSchema,
} from "@/features/members/schemas";

const UUID = "123e4567-e89b-12d3-a456-426614174000";

describe("inviteMemberSchema", () => {
  it("aceita e-mail válido com role padrão", () => {
    const result = inviteMemberSchema.safeParse({ email: "user@example.com" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.role).toBe("member");
    }
  });

  it("aceita role admin explícito", () => {
    const result = inviteMemberSchema.safeParse({ email: "admin@test.com", role: "admin" });
    expect(result.success).toBe(true);
  });

  it("rejeita e-mail inválido", () => {
    const result = inviteMemberSchema.safeParse({ email: "nao-é-email" });
    expect(result.success).toBe(false);
  });

  it("rejeita role owner", () => {
    const result = inviteMemberSchema.safeParse({ email: "x@x.com", role: "owner" });
    expect(result.success).toBe(false);
  });

  it("faz trim do e-mail", () => {
    const result = inviteMemberSchema.safeParse({ email: "  user@example.com  " });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.email).toBe("user@example.com");
  });
});

describe("revokeInviteSchema", () => {
  it("aceita UUID válido", () => {
    const result = revokeInviteSchema.safeParse({ invite_id: UUID });
    expect(result.success).toBe(true);
  });

  it("rejeita string não-UUID", () => {
    const result = revokeInviteSchema.safeParse({ invite_id: "not-a-uuid" });
    expect(result.success).toBe(false);
  });
});

describe("removeMemberSchema", () => {
  it("aceita UUID válido", () => {
    const result = removeMemberSchema.safeParse({ user_id: UUID });
    expect(result.success).toBe(true);
  });

  it("rejeita string vazia", () => {
    const result = removeMemberSchema.safeParse({ user_id: "" });
    expect(result.success).toBe(false);
  });
});

describe("transferOwnershipSchema", () => {
  it("aceita UUID válido", () => {
    const result = transferOwnershipSchema.safeParse({ new_owner_id: UUID });
    expect(result.success).toBe(true);
  });

  it("rejeita UUID inválido", () => {
    const result = transferOwnershipSchema.safeParse({ new_owner_id: "abc123" });
    expect(result.success).toBe(false);
  });
});
