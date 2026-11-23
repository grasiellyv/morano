import {
  CalendarCheck,
  House,
  Settings,
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

export const SETTINGS_NAV: {
  href: "/configuracoes";
  label: "Configurações";
  icon: LucideIcon;
} = {
  href: "/configuracoes",
  label: "Configurações",
  icon: Settings,
};
