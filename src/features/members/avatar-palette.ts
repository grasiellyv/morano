/** Paleta de avatares: cores para os primeiros moradores. */
export const AVATAR_PALETTE = [
  { bg: "#EBD5BE", color: "#6B3A17" },
  { bg: "#F3CFCF", color: "#8A2F3A" },
  { bg: "#D5DEEA", color: "#2C4A6E" },
  { bg: "#D8E8D6", color: "#2D5428" },
  { bg: "#E8D5EA", color: "#5A2D6B" },
];

export function getInitial(name: string | null, fallback = "?"): string {
  return (name ?? fallback).charAt(0).toUpperCase();
}
