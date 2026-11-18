import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(join(__dirname, "globals.css"), "utf8");

const declarations = new Map<string, string>();
for (const match of css.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
  const name = match[1]!;
  // First declaration wins (the :root block); later @theme aliases must not override it.
  if (!declarations.has(name)) declarations.set(name, match[2]!.trim());
}

function resolve(name: string, depth = 0): string {
  if (depth > 10) throw new Error(`Referência circular em ${name}`);
  const value = declarations.get(name);
  if (value === undefined) throw new Error(`Variável ausente: ${name}`);
  const ref = /^var\((--[\w-]+)\)$/.exec(value);
  if (ref) return resolve(ref[1]!, depth + 1);
  if (!/^#[0-9a-fA-F]{6}$/.test(value)) {
    throw new Error(`${name} não resolve para um hex de 6 dígitos: ${value}`);
  }
  return value;
}

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = channels.map((c) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4),
  ) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(fg: string, bg: string): number {
  const a = luminance(resolve(fg));
  const b = luminance(resolve(bg));
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

const pairs: [fg: string, bg: string][] = [
  ["--foreground", "--background"],
  ["--muted-foreground", "--background"],
  ["--muted-foreground", "--muted"],
  ["--primary-foreground", "--primary"],
  ["--secondary-foreground", "--secondary"],
  ["--accent-foreground", "--accent"],
  ["--destructive", "--background"],
  ["--color-alert-ink", "--color-sand"],
  ["--color-graphite", "--color-caramel"],
];

describe("contraste dos tokens (WCAG AA)", () => {
  it.each(pairs)("%s sobre %s tem contraste >= 4.5", (fg, bg) => {
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(["--color-sage", "--color-caramel"])(
    "%s não serve para texto sobre --background (< 4.5)",
    (fg) => {
      expect(contrast(fg, "--background")).toBeLessThan(4.5);
    },
  );
});
