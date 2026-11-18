import { describe, expect, it } from "vitest";
import { forgotPasswordSchema, resetPasswordSchema, signInSchema, signUpSchema } from "./schemas";

const validSignUp = {
  fullName: "  Ana Souza  ",
  email: "ana@example.com",
  password: "senha1234",
  termsAccepted: true,
};

function firstMessage(result: { success: boolean; error?: { issues: { message: string }[] } }) {
  return result.error?.issues[0]?.message;
}

describe("signUpSchema", () => {
  it("aceita um cadastro válido e apara o nome", () => {
    const result = signUpSchema.safeParse(validSignUp);
    expect(result.success).toBe(true);
    expect(result.data?.fullName).toBe("Ana Souza");
  });

  it("exige letras e números na senha", () => {
    const result = signUpSchema.safeParse({ ...validSignUp, password: "abcdefgh" });
    expect(result.success).toBe(false);
    expect(firstMessage(result)).toBe("A senha precisa ter letras e números.");
  });

  it("exige no mínimo 8 caracteres", () => {
    const result = signUpSchema.safeParse({ ...validSignUp, password: "abc12" });
    expect(firstMessage(result)).toBe("A senha precisa ter pelo menos 8 caracteres.");
  });

  it("exige aceitar os termos", () => {
    const result = signUpSchema.safeParse({ ...validSignUp, termsAccepted: false });
    expect(result.success).toBe(false);
    expect(firstMessage(result)).toBe("Aceite os termos para continuar.");
  });

  it("recusa nome curto e e-mail inválido", () => {
    expect(signUpSchema.safeParse({ ...validSignUp, fullName: " a " }).success).toBe(false);
    expect(signUpSchema.safeParse({ ...validSignUp, email: "ana" }).success).toBe(false);
  });
});

describe("signInSchema e forgotPasswordSchema", () => {
  it("validam e-mail e senha", () => {
    expect(signInSchema.safeParse({ email: "ana@example.com", password: "x" }).success).toBe(true);
    expect(signInSchema.safeParse({ email: "ana@example.com", password: "" }).success).toBe(false);
    expect(forgotPasswordSchema.safeParse({ email: "nao-e-email" }).success).toBe(false);
  });
});

describe("resetPasswordSchema", () => {
  it("aceita senhas iguais", () => {
    const result = resetPasswordSchema.safeParse({
      password: "senha1234",
      confirmPassword: "senha1234",
    });
    expect(result.success).toBe(true);
  });

  it("recusa senhas diferentes", () => {
    const result = resetPasswordSchema.safeParse({
      password: "senha1234",
      confirmPassword: "senha12345",
    });
    expect(result.success).toBe(false);
    expect(firstMessage(result)).toBe("As senhas não coincidem.");
    expect(result.error?.issues[0]?.path).toEqual(["confirmPassword"]);
  });
});
