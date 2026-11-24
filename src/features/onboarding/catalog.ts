export const ROOM_TYPES = [
  "sala",
  "cozinha",
  "quarto",
  "banheiro",
  "lavanderia",
  "escritorio",
  "varanda",
  "garagem",
  "outro",
] as const;

export type RoomType = (typeof ROOM_TYPES)[number];

export const ROUTINE_LEVELS = ["leve", "equilibrada", "detalhada"] as const;

export type RoutineLevel = (typeof ROUTINE_LEVELS)[number];

export type CatalogTask = {
  id: string;
  room_type: RoomType;
  title: string;
  frequency_type: "daily" | "weekly" | "biweekly" | "monthly";
  min_level: RoutineLevel;
  priority: "baixa" | "media" | "alta";
};

const LEVEL_ORDER: Record<RoutineLevel, number> = {
  leve: 0,
  equilibrada: 1,
  detalhada: 2,
};

export const CATALOG: CatalogTask[] = [
  { id: "cozinha_lavar_louca", room_type: "cozinha", title: "Lavar louça", frequency_type: "daily", min_level: "leve", priority: "alta" },
  { id: "cozinha_varrer_chao", room_type: "cozinha", title: "Varrer o chão", frequency_type: "daily", min_level: "leve", priority: "alta" },
  { id: "cozinha_limpar_fogao", room_type: "cozinha", title: "Limpar fogão", frequency_type: "weekly", min_level: "equilibrada", priority: "alta" },
  { id: "cozinha_limpar_balcao", room_type: "cozinha", title: "Limpar bancada e pia", frequency_type: "daily", min_level: "equilibrada", priority: "media" },
  { id: "cozinha_organizar_geladeira", room_type: "cozinha", title: "Organizar geladeira", frequency_type: "monthly", min_level: "detalhada", priority: "media" },
  { id: "cozinha_limpar_microondas", room_type: "cozinha", title: "Limpar interior do micro-ondas", frequency_type: "biweekly", min_level: "detalhada", priority: "baixa" },
  { id: "sala_varrer_chao", room_type: "sala", title: "Varrer o chão", frequency_type: "daily", min_level: "leve", priority: "alta" },
  { id: "sala_passar_aspirador", room_type: "sala", title: "Passar aspirador", frequency_type: "weekly", min_level: "leve", priority: "alta" },
  { id: "sala_limpar_moveis", room_type: "sala", title: "Limpar móveis com flanela", frequency_type: "weekly", min_level: "equilibrada", priority: "media" },
  { id: "sala_limpar_vidros", room_type: "sala", title: "Limpar vidros e janelas", frequency_type: "biweekly", min_level: "detalhada", priority: "media" },
  { id: "sala_organizar_estantes", room_type: "sala", title: "Organizar estantes e prateleiras", frequency_type: "monthly", min_level: "detalhada", priority: "baixa" },
  { id: "quarto_arrumar_cama", room_type: "quarto", title: "Arrumar a cama", frequency_type: "daily", min_level: "leve", priority: "alta" },
  { id: "quarto_passar_aspirador", room_type: "quarto", title: "Passar aspirador", frequency_type: "weekly", min_level: "leve", priority: "alta" },
  { id: "quarto_limpar_moveis", room_type: "quarto", title: "Limpar móveis com flanela", frequency_type: "weekly", min_level: "equilibrada", priority: "media" },
  { id: "quarto_trocar_roupa_cama", room_type: "quarto", title: "Trocar roupa de cama", frequency_type: "weekly", min_level: "equilibrada", priority: "alta" },
  { id: "quarto_organizar_armario", room_type: "quarto", title: "Organizar armário", frequency_type: "monthly", min_level: "detalhada", priority: "media" },
  { id: "banheiro_limpar_pia", room_type: "banheiro", title: "Limpar pia e espelho", frequency_type: "weekly", min_level: "leve", priority: "alta" },
  { id: "banheiro_limpar_vaso", room_type: "banheiro", title: "Limpar vaso sanitário", frequency_type: "weekly", min_level: "leve", priority: "alta" },
  { id: "banheiro_limpar_chuveiro", room_type: "banheiro", title: "Limpar chuveiro e box", frequency_type: "weekly", min_level: "equilibrada", priority: "alta" },
  { id: "banheiro_lavar_piso", room_type: "banheiro", title: "Lavar piso com desinfetante", frequency_type: "weekly", min_level: "equilibrada", priority: "media" },
  { id: "banheiro_limpar_rejunte", room_type: "banheiro", title: "Limpar rejunte das paredes", frequency_type: "monthly", min_level: "detalhada", priority: "media" },
  { id: "lavanderia_lavar_roupas", room_type: "lavanderia", title: "Lavar roupas", frequency_type: "weekly", min_level: "leve", priority: "alta" },
  { id: "lavanderia_dobrar_roupas", room_type: "lavanderia", title: "Dobrar e guardar roupas", frequency_type: "weekly", min_level: "equilibrada", priority: "alta" },
  { id: "lavanderia_limpar_maquina", room_type: "lavanderia", title: "Limpar máquina de lavar", frequency_type: "monthly", min_level: "detalhada", priority: "media" },
];

export function filterCatalog(rooms: RoomType[], level: RoutineLevel): CatalogTask[] {
  return CATALOG.filter(
    (t) =>
      rooms.includes(t.room_type) &&
      LEVEL_ORDER[t.min_level] <= LEVEL_ORDER[level],
  );
}

/**
 * Cômodo e prioridade de uma tarefa sugerida, resolvidos NO SERVIDOR a partir do id do
 * catálogo (o cliente só diz qual sugestão foi aprovada). Sem isso, "Varrer o chão" da
 * cozinha, da sala e do quarto viravam três tarefas idênticas e sem cômodo.
 * Vários cômodos do mesmo tipo (ex.: dois quartos): vale o primeiro, por posição.
 */
export function onboardingTaskRow(
  catalogId: string,
  rooms: ReadonlyArray<{ id: string; room_type: string; position: number }>,
): { room_id: string | null; priority: CatalogTask["priority"] } {
  const entry = CATALOG.find((t) => t.id === catalogId);
  if (!entry) return { room_id: null, priority: "media" };
  const room = [...rooms]
    .filter((r) => r.room_type === entry.room_type)
    .sort((a, b) => a.position - b.position)[0];
  return { room_id: room?.id ?? null, priority: entry.priority };
}
