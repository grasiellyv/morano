export type TaskPriority = "alta" | "media" | "baixa";

export const PRIORITY_LABEL: Record<TaskPriority, string> = {
  alta: "Alta",
  media: "Média",
  baixa: "Baixa",
};

export const PRIORITY_BADGE_CLASS: Record<TaskPriority, string> = {
  alta: "bg-red-100 text-red-700",
  media: "bg-yellow-100 text-yellow-700",
  baixa: "bg-muted text-muted-foreground",
};

export const PRIORITY_ORDER: Record<TaskPriority, number> = {
  alta: 0,
  media: 1,
  baixa: 2,
};

export const PRIORITY_OPTIONS = [
  { value: "baixa", label: PRIORITY_LABEL.baixa },
  { value: "media", label: PRIORITY_LABEL.media },
  { value: "alta", label: PRIORITY_LABEL.alta },
] as const;
