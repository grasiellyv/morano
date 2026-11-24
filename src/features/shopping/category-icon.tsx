import {
  Apple,
  Baby,
  Beef,
  Carrot,
  Coffee,
  CookingPot,
  Croissant,
  Droplets,
  Gift,
  House,
  Milk,
  Package,
  PawPrint,
  Pill,
  ShoppingCart,
  Shirt,
  Sparkles,
  SprayCan,
  Wine,
  Wrench,
  type LucideIcon,
  type LucideProps,
} from "lucide-react";

/**
 * Ícones de categoria de compras. A coluna `shopping_categories.icon` guarda a
 * chave (ex.: "apple"). Registros antigos guardam emoji — `resolveCategoryIcon`
 * converte os emojis do seed e cai em "package" para qualquer valor desconhecido.
 * Imports nomeados do lucide são tree-shaken: só estes ~20 SVGs entram no bundle.
 */
export const CATEGORY_ICONS = {
  apple: Apple,
  carrot: Carrot,
  beef: Beef,
  croissant: Croissant,
  milk: Milk,
  coffee: Coffee,
  wine: Wine,
  "cooking-pot": CookingPot,
  droplets: Droplets,
  "spray-can": SprayCan,
  sparkles: Sparkles,
  shirt: Shirt,
  baby: Baby,
  "paw-print": PawPrint,
  pill: Pill,
  home: House,
  wrench: Wrench,
  gift: Gift,
  "shopping-cart": ShoppingCart,
  package: Package,
} as const satisfies Record<string, LucideIcon>;

export type CategoryIconKey = keyof typeof CATEGORY_ICONS;
export const CATEGORY_ICON_KEYS = Object.keys(CATEGORY_ICONS) as CategoryIconKey[];
export const CATEGORY_ICON_LABELS: Record<CategoryIconKey, string> = {
  apple: "Fruta",
  carrot: "Legume",
  beef: "Carne",
  croissant: "Padaria",
  milk: "Laticínio",
  coffee: "Café",
  wine: "Bebida",
  "cooking-pot": "Cozinha",
  droplets: "Higiene",
  "spray-can": "Produto de limpeza",
  sparkles: "Limpeza",
  shirt: "Lavanderia",
  baby: "Bebê",
  "paw-print": "Pet",
  pill: "Saúde",
  home: "Casa",
  wrench: "Ferramenta",
  gift: "Presente",
  "shopping-cart": "Carrinho",
  package: "Outros",
};
export const DEFAULT_CATEGORY_ICON: CategoryIconKey = "shopping-cart";

const LEGACY_EMOJI: Record<string, CategoryIconKey> = {
  "🍎": "apple",
  "🧴": "droplets",
  "🧹": "sparkles",
  "🧺": "shirt",
  "🍼": "baby",
  "🐾": "paw-print",
  "🩹": "pill",
  "🍳": "cooking-pot",
  "📦": "package",
  "🛒": "shopping-cart",
};

export function resolveCategoryIcon(value: string | null | undefined): CategoryIconKey {
  if (!value) return "package";
  if (value in CATEGORY_ICONS) return value as CategoryIconKey;
  return LEGACY_EMOJI[value.trim()] ?? "package";
}

export function CategoryIcon({
  icon,
  size = 16,
  ...props
}: { icon: string | null | undefined } & Omit<LucideProps, "ref">) {
  const Cmp = CATEGORY_ICONS[resolveCategoryIcon(icon)];
  return <Cmp size={size} strokeWidth={1.75} aria-hidden {...props} />;
}
