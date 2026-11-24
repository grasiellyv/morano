import {
  CalendarCheck,
  House,
  UserRound,
  ShoppingBasket,
  Sofa,
  Wrench,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: "/inicio" | "/rotina" | "/casa" | "/manutencao" | "/compras";
  label: string;
  icon: LucideIcon;
};

export const PRIMARY_NAV: readonly NavItem[] = [
  { href: "/inicio", label: "Início", icon: House },
  { href: "/rotina", label: "Rotina", icon: CalendarCheck },
  { href: "/compras", label: "Compras", icon: ShoppingBasket },
  { href: "/manutencao", label: "Manutenção", icon: Wrench },
  { href: "/casa", label: "Casa", icon: Sofa },
];

/** Conta da pessoa (antes: Configurações + Perfil, páginas separadas). */
export const ACCOUNT_NAV: {
  href: "/perfil";
  label: "Minha conta";
  icon: LucideIcon;
} = {
  href: "/perfil",
  label: "Minha conta",
  icon: UserRound,
};
