import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MORANO",
    short_name: "MORANO",
    description: "Sua casa. Sob controle.",
    lang: "pt-BR",
    start_url: "/inicio",
    display: "standalone",
    background_color: "#F5F2EC",
    theme_color: "#F5F2EC",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
