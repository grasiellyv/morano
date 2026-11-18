/**
 * Limites dos planos. Espelha a função SQL `public.plan_limits(plan)` (migration
 * billing_telemetry); `null` significa ilimitado. O banco é quem faz valer os
 * limites (triggers before insert); este arquivo serve à interface (avisos,
 * telas de plano) e deve ser mantido igual ao SQL.
 */
export type PlanId = "free" | "pro";

export interface PlanLimits {
  maxHomes: number | null;
  maxActiveTasks: number | null;
  maxAppliances: number | null;
  attachmentsAllowed: boolean;
}

export const PLAN_LIMITS: Record<PlanId, PlanLimits> = {
  free: {
    maxHomes: 1,
    maxActiveTasks: 40,
    maxAppliances: 5,
    attachmentsAllowed: false,
  },
  pro: {
    maxHomes: null,
    maxActiveTasks: null,
    maxAppliances: null,
    attachmentsAllowed: true,
  },
};

export type PlanLimitError =
  "plan_limit_homes" | "plan_limit_tasks" | "plan_limit_appliances" | "plan_limit_attachments";

/** Mensagens pt-BR para os erros P0001 levantados pelos triggers de limite. */
export const PLAN_LIMIT_ERRORS: Record<PlanLimitError, string> = {
  plan_limit_homes:
    "No plano gratuito você pode ter 1 casa. Conheça o MORANO PRO para cadastrar mais.",
  plan_limit_tasks:
    "No plano gratuito você pode ter até 40 tarefas ativas por casa. Pause ou arquive alguma ou conheça o MORANO PRO.",
  plan_limit_appliances:
    "No plano gratuito você pode cadastrar até 5 equipamentos. Arquive um ou conheça o MORANO PRO.",
  plan_limit_attachments:
    "Fotos e documentos fazem parte do MORANO PRO. Os que você já enviou continuam disponíveis.",
};
