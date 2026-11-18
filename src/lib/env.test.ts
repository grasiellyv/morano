import { describe, expect, it } from "vitest";
import { parsePublicEnv } from "./env";

const valid = {
  NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_teste",
  NEXT_PUBLIC_SITE_URL: "http://localhost:3100",
  NEXT_PUBLIC_AUTH_GOOGLE_ENABLED: "true",
};

describe("parsePublicEnv", () => {
  it("devolve o objeto para uma entrada válida", () => {
    expect(parsePublicEnv(valid)).toEqual({
      supabaseUrl: "http://127.0.0.1:54321",
      supabasePublishableKey: "sb_publishable_teste",
      siteUrl: "http://localhost:3100",
      googleAuthEnabled: true,
    });
  });

  it("googleAuthEnabled só é true com o valor exato 'true'", () => {
    for (const v of [undefined, "", "TRUE", "1", "false", "yes"]) {
      expect(
        parsePublicEnv({ ...valid, NEXT_PUBLIC_AUTH_GOOGLE_ENABLED: v }).googleAuthEnabled,
      ).toBe(false);
    }
  });

  it("falha citando o nome da variável quando a URL falta", () => {
    expect(() => parsePublicEnv({ ...valid, NEXT_PUBLIC_SUPABASE_URL: undefined })).toThrow(
      "Variável de ambiente inválida: NEXT_PUBLIC_SUPABASE_URL",
    );
  });

  it("falha quando a chave publicável falta", () => {
    expect(() => parsePublicEnv({ ...valid, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "" })).toThrow(
      "Variável de ambiente inválida: NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    );
  });

  it("falha quando NEXT_PUBLIC_SITE_URL não é uma URL", () => {
    expect(() => parsePublicEnv({ ...valid, NEXT_PUBLIC_SITE_URL: "não é url" })).toThrow(
      "Variável de ambiente inválida: NEXT_PUBLIC_SITE_URL",
    );
  });

  it("usa http://localhost:3000 quando siteUrl está ausente", () => {
    expect(parsePublicEnv({ ...valid, NEXT_PUBLIC_SITE_URL: undefined }).siteUrl).toBe(
      "http://localhost:3000",
    );
  });
});
