import type { Event } from "@/features/events/queries";

const TYPE_LABELS: Record<Event["event_type"], string> = {
  aniversario: "Aniversário",
  viagem: "Viagem",
  jantar: "Jantar",
  consulta_medica: "Consulta",
  visita: "Visita",
  manutencao: "Manutenção",
  feriado: "Feriado",
  outros: "Outros",
};

type ColorPair = { bg: string; text: string };

const TYPE_COLORS: Record<Event["event_type"], ColorPair> = {
  aniversario:    { bg: "#F3D2D8", text: "#8A2F45" },
  jantar:         { bg: "#F6DDB9", text: "#6E420F" },
  visita:         { bg: "#F6DDB9", text: "#6E420F" },
  viagem:         { bg: "#D5DEEA", text: "#2C4A6E" },
  consulta_medica:{ bg: "#D5DEEA", text: "#2C4A6E" },
  manutencao:     { bg: "#F7DCCB", text: "#7E3417" },
  feriado:        { bg: "#F5E4D2", text: "#725E4F" },
  outros:         { bg: "#F5E4D2", text: "#725E4F" },
};

type Props = {
  event: Event;
  compact?: boolean;
};

export function EventChip({ event, compact = false }: Props) {
  const colors = TYPE_COLORS[event.event_type];
  const label = TYPE_LABELS[event.event_type];

  if (compact) {
    return (
      <div
        className="text-xs rounded px-1 py-0.5 leading-snug truncate"
        style={{ background: colors.bg, color: colors.text }}
        title={`${label}: ${event.title}`}
      >
        {event.title}
      </div>
    );
  }

  return (
    <div
      className="rounded-[14px] px-3 py-2 flex items-center gap-2"
      style={{ background: colors.bg, color: colors.text }}
    >
      <span className="text-xs font-medium opacity-70 shrink-0">{label}</span>
      <span className="text-sm font-medium">{event.title}</span>
      {event.start_time ? (
        <span className="ml-auto text-xs opacity-70">{event.start_time}</span>
      ) : null}
    </div>
  );
}
