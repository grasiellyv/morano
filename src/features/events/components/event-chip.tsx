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

const TYPE_COLORS: Record<Event["event_type"], string> = {
  aniversario: "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300",
  viagem: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  jantar: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  consulta_medica: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  visita: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  manutencao: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  feriado: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  outros: "bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-300",
};

type Props = {
  event: Event;
  compact?: boolean;
};

export function EventChip({ event, compact = false }: Props) {
  const colorClass = TYPE_COLORS[event.event_type];
  const label = TYPE_LABELS[event.event_type];

  if (compact) {
    return (
      <div
        className={`${colorClass} text-xs rounded px-1 py-0.5 leading-snug truncate`}
        title={`${label}: ${event.title}`}
      >
        {event.title}
      </div>
    );
  }

  return (
    <div className={`${colorClass} rounded-lg px-3 py-2 flex items-center gap-2`}>
      <span className="text-xs font-medium opacity-70 shrink-0">{label}</span>
      <span className="text-sm font-medium">{event.title}</span>
    </div>
  );
}
