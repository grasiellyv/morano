import Link from "next/link";
import { AVATAR_PALETTE, getInitial } from "@/features/members/avatar-palette";

/**
 * Único ponto de entrada para a conta da pessoa (nome, e-mail, ausência, senha,
 * sair). Substitui a engrenagem + avatar que levavam a páginas diferentes.
 * A aba Casa continua sendo o lugar de tudo que é da casa.
 */
export function AccountButton({ name, size = 40 }: { name: string | null; size?: number }) {
  const palette = AVATAR_PALETTE[0]!;
  return (
    <Link
      href="/perfil"
      aria-label="Minha conta"
      className="flex shrink-0 items-center justify-center rounded-full font-semibold no-underline outline-none focus-visible:ring-2 focus-visible:ring-ring"
      style={{
        width: size,
        height: size,
        fontSize: size >= 40 ? 15 : 13,
        background: palette.bg,
        color: palette.color,
      }}
    >
      <span aria-hidden>{getInitial(name)}</span>
    </Link>
  );
}
