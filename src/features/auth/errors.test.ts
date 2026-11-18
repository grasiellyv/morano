import { describe, expect, it } from "vitest";
import { authErrorMessage, SIGN_UP_NEUTRAL_MESSAGE } from "./errors";

describe("authErrorMessage", () => {
  it.each([
    ["invalid_credentials", "E-mail ou senha incorretos."],
    ["email_not_confirmed", "Confirme seu e-mail antes de entrar. Reenviamos o link."],
    ["user_already_exists", SIGN_UP_NEUTRAL_MESSAGE],
    ["weak_password", "Escolha uma senha mais forte."],
    ["over_email_send_rate_limit", "Muitas tentativas. Aguarde alguns minutos."],
  ])("%s", (code, message) => {
    expect(authErrorMessage(code)).toBe(message);
  });

  it("usa a mensagem padrão para códigos desconhecidos", () => {
    expect(authErrorMessage("unexpected_failure")).toBe(
      "Não foi possível concluir. Tente novamente.",
    );
    expect(authErrorMessage(undefined)).toBe("Não foi possível concluir. Tente novamente.");
  });

  it("não usa propriedades herdadas como código", () => {
    expect(authErrorMessage("toString")).toBe("Não foi possível concluir. Tente novamente.");
  });
});
