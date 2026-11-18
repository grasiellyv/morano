import { describe, expect, it } from "vitest";
import manifest from "./manifest";

describe("manifest", () => {
  it("describes the PWA", () => {
    const m = manifest();
    expect(m).toMatchObject({
      name: "MORANO",
      short_name: "MORANO",
      description: "Sua casa. Sob controle.",
      lang: "pt-BR",
      start_url: "/inicio",
      display: "standalone",
      background_color: "#F5F2EC",
      theme_color: "#F5F2EC",
    });
    expect(m.icons).toEqual(
      expect.arrayContaining([
        { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
        { src: "/apple-icon", sizes: "180x180", type: "image/png" },
      ]),
    );
  });
});
