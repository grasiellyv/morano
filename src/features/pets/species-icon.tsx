import { Bird, Cat, Dog, Fish, PawPrint, Rat, type LucideIcon, type LucideProps } from "lucide-react";
import type { Species } from "@/features/pets/schemas";

const ICONS: Record<Species, LucideIcon> = {
  cachorro: Dog,
  gato: Cat,
  passaro: Bird,
  peixe: Fish,
  roedor: Rat,
  outro: PawPrint,
};

export function SpeciesIcon({ species, size = 18, ...props }: { species: Species } & Omit<LucideProps, "ref">) {
  const Icon = ICONS[species] ?? PawPrint;
  return <Icon size={size} aria-hidden {...props} />;
}
