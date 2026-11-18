import { describe, expect, it } from "vitest";
import { authErrorMessage, SIGN_UP_NEUTRAL_MESSAGE, unconfirmedSignInMessage } from "./errors";

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

describe("unconfirmedSignInMessage", () => {
  it("promete o reenvio só quando ele deu certo", () => {
    expect(unconfirmedSignInMessage(null)).toBe(
      "Confirme seu e-mail antes de entrar. Reenviamos o link.",
    );
  });

  it("pede para aguardar quando o reenvio bateu no limite", () => {
    expect(unconfirmedSignInMessage({ code: "over_email_send_rate_limit" })).toBe(
      "Confirme seu e-mail antes de entrar. Aguarde alguns minutos para pedir um novo link.",
    );
  });

  it("não promete nada em outros erros", () => {
    expect(unconfirmedSignInMessage({ code: "unexpected_failure" })).toBe(
      "Confirme seu e-mail antes de entrar.",
    );
    expect(unconfirmedSignInMessage({})).toBe("Confirme seu e-mail antes de entrar.");
  });
});
