import Link from "next/link";

/**
 * Cabeçalho e alternador compartilhados pelas visões da Rotina
 * (Hoje / Semana em /rotina e Calendário em /rotina/calendario).
 */

export function RotinaHeader({ actions }: { actions?: React.ReactNode }) {
  return (
    <header className="flex items-start justify-between gap-3 pb-4">
      <div className="min-w-0">
        <h1
          style={{
            fontSize: 24,
            fontWeight: 400,
            letterSpacing: "-0.4px",
            color: "var(--foreground)",
            lineHeight: 1.2,
          }}
        >
          Rotina
        </h1>
        <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 4 }}>
          Tudo o que precisa acontecer na casa.
        </p>
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </header>
  );
}

export type RotinaTab = "dia" | "semana" | "calendario";

export function RotinaTabs({
  active,
  hrefs,
  dayLabel = "Hoje",
}: {
  active: RotinaTab;
  hrefs: Record<RotinaTab, string>;
  /** "Hoje" quando o dia aberto é hoje; senão o rótulo curto do dia. */
  dayLabel?: string;
}) {
  const tabs: Array<{ key: RotinaTab; label: string }> = [
    { key: "dia", label: dayLabel },
    { key: "semana", label: "Semana" },
    { key: "calendario", label: "Calendário" },
  ];

  return (
    <nav
      aria-label="Visões da rotina"
      style={{
        height: 42,
        borderRadius: 12,
        background: "var(--secondary)",
        display: "flex",
        padding: 3,
        gap: 3,
        marginBottom: 20,
      }}
    >
      {tabs.map((t) => {
        const isActive = t.key === active;
        return (
          <Link
            key={t.key}
            href={hrefs[t.key]}
            aria-current={isActive ? "page" : undefined}
            className="focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{
              flex: 1,
              borderRadius: 9,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 13.5,
              fontWeight: isActive ? 600 : 500,
              color: isActive ? "var(--foreground)" : "var(--muted-foreground)",
              background: isActive ? "var(--card)" : "transparent",
              boxShadow: isActive ? "var(--shadow)" : "none",
              textDecoration: "none",
            }}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function IconButton({
  label,
  onClick,
  href,
  dark = false,
  add = false,
  pressed,
  badge,
  children,
}: {
  label: string;
  onClick?: () => void;
  href?: string;
  dark?: boolean;
  /** Ação de criar/adicionar: fundo verde (token --add). */
  add?: boolean;
  pressed?: boolean;
  badge?: number;
  children: React.ReactNode;
}) {
  const style: React.CSSProperties = {
    position: "relative",
    width: 40,
    height: 40,
    borderRadius: 20,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: add ? "var(--add)" : dark || pressed ? "var(--nav-active)" : "var(--card)",
    color: add ? "var(--add-foreground)" : dark || pressed ? "var(--nav-active-ink)" : "var(--foreground)",
    border: add || dark || pressed ? "none" : "1px solid var(--border)",
    cursor: "pointer",
  };
  const badgeEl =
    badge && badge > 0 ? (
      <span
        aria-hidden
        style={{
          position: "absolute",
          top: -2,
          right: -2,
          minWidth: 16,
          height: 16,
          borderRadius: 8,
          padding: "0 4px",
          background: "#D98A2B",
          color: "#2A1B12",
          fontSize: 10,
          fontWeight: 600,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {badge}
      </span>
    ) : null;

  if (href) {
    return (
      <Link href={href} aria-label={label} title={label} style={style}>
        {children}
        {badgeEl}
      </Link>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      style={style}
    >
      {children}
      {badgeEl}
    </button>
  );
}

const svgProps = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export function PlusIcon() {
  return (
    <svg {...svgProps} strokeWidth={1.75}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

/** Funil: "filtrar" sem confundir com configurações (engrenagem/sliders). */
export function FilterIcon() {
  return (
    <svg {...svgProps}>
      <path d="M4 5h16l-6 7.5V19l-4-2v-4.5z" />
    </svg>
  );
}
