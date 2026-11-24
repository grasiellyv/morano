import "./loading.css";
import {
  LoadingIconCasa,
  LoadingIconCompras,
  LoadingIconInicio,
  LoadingIconManutencao,
  LoadingIconRotina,
} from "./loading-icons";

const ICONS = {
  inicio: LoadingIconInicio,
  rotina: LoadingIconRotina,
  compras: LoadingIconCompras,
  manutencao: LoadingIconManutencao,
  casa: LoadingIconCasa,
} as const;

export type LoadingArea = keyof typeof ICONS;

/** Tela de carregamento com ícone animado por área (DESIGN.md). */
export function LoadingScreen({ area, message }: { area: LoadingArea; message: string }) {
  const Icon = ICONS[area];
  return (
    <div className={`ld-screen ld-screen--${area}`} role="status" aria-live="polite">
      <Icon />
      <p className="ld-caption">{message}</p>
      <div className="ld-bar-track">
        <div className="ld-bar-fill" />
      </div>
    </div>
  );
}
