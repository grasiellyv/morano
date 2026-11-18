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
  estimated_minutes: number;
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
  {
    id: "cozinha_lavar_louca",
    room_type: "cozinha",
    title: "Lavar louça",
    estimated_minutes: 15,
    frequency_type: "daily",
    min_level: "leve",
    priority: "alta",
  },
  {
    id: "cozinha_varrer_chao",
    room_type: "cozinha",
    title: "Varrer o chão",
    estimated_minutes: 10,
    frequency_type: "daily",
    min_level: "leve",
    priority: "alta",
  },
  {
    id: "cozinha_limpar_fogao",
    room_type: "cozinha",
    title: "Limpar fogão",
    estimated_minutes: 20,
    frequency_type: "weekly",
    min_level: "equilibrada",
    priority: "alta",
  },
  {
    id: "cozinha_limpar_balcao",
    room_type: "cozinha",
    title: "Limpar bancada e pia",
    estimated_minutes: 10,
    frequency_type: "daily",
    min_level: "equilibrada",
    priority: "media",
  },
  {
    id: "cozinha_organizar_geladeira",
    room_type: "cozinha",
    title: "Organizar geladeira",
    estimated_minutes: 30,
    frequency_type: "monthly",
    min_level: "detalhada",
    priority: "media",
  },
  {
    id: "cozinha_limpar_microondas",
    room_type: "cozinha",
    title: "Limpar interior do micro-ondas",
    estimated_minutes: 15,
    frequency_type: "biweekly",
    min_level: "detalhada",
    priority: "baixa",
  },
  {
    id: "sala_varrer_chao",
    room_type: "sala",
    title: "Varrer o chão",
    estimated_minutes: 10,
    frequency_type: "daily",
    min_level: "leve",
    priority: "alta",
  },
  {
    id: "sala_passar_aspirador",
    room_type: "sala",
    title: "Passar aspirador",
    estimated_minutes: 20,
    frequency_type: "weekly",
    min_level: "leve",
    priority: "alta",
  },
  {
    id: "sala_limpar_moveis",
    room_type: "sala",
    title: "Limpar móveis com flanela",
    estimated_minutes: 15,
    frequency_type: "weekly",
    min_level: "equilibrada",
    priority: "media",
  },
  {
    id: "sala_limpar_vidros",
    room_type: "sala",
    title: "Limpar vidros e janelas",
    estimated_minutes: 20,
    frequency_type: "biweekly",
    min_level: "detalhada",
    priority: "media",
  },
  {
    id: "sala_organizar_estantes",
    room_type: "sala",
    title: "Organizar estantes e prateleiras",
    estimated_minutes: 30,
    frequency_type: "monthly",
    min_level: "detalhada",
    priority: "baixa",
  },
  {
    id: "quarto_arrumar_cama",
    room_type: "quarto",
    title: "Arrumar a cama",
    estimated_minutes: 5,
    frequency_type: "daily",
    min_level: "leve",
    priority: "alta",
  },
  {
    id: "quarto_passar_aspirador",
    room_type: "quarto",
    title: "Passar aspirador",
    estimated_minutes: 20,
    frequency_type: "weekly",
    min_level: "leve",
    priority: "alta",
  },
  {
    id: "quarto_limpar_moveis",
    room_type: "quarto",
    title: "Limpar móveis com flanela",
    estimated_minutes: 15,
    frequency_type: "weekly",
    min_level: "equilibrada",
    priority: "media",
  },
  {
    id: "quarto_trocar_roupa_cama",
    room_type: "quarto",
    title: "Trocar roupa de cama",
    estimated_minutes: 15,
    frequency_type: "weekly",
    min_level: "equilibrada",
    priority: "alta",
  },
  {
    id: "quarto_organizar_armario",
    room_type: "quarto",
    title: "Organizar armário",
    estimated_minutes: 60,
    frequency_type: "monthly",
    min_level: "detalhada",
    priority: "media",
  },
  {
    id: "banheiro_limpar_pia",
    room_type: "banheiro",
    title: "Limpar pia e espelho",
    estimated_minutes: 10,
    frequency_type: "weekly",
    min_level: "leve",
    priority: "alta",
  },
  {
    id: "banheiro_limpar_vaso",
    room_type: "banheiro",
    title: "Limpar vaso sanitário",
    estimated_minutes: 15,
    frequency_type: "weekly",
    min_level: "leve",
    priority: "alta",
  },
  {
    id: "banheiro_limpar_chuveiro",
    room_type: "banheiro",
    title: "Limpar chuveiro e box",
    estimated_minutes: 20,
    frequency_type: "weekly",
    min_level: "equilibrada",
    priority: "alta",
  },
  {
    id: "banheiro_lavar_piso",
    room_type: "banheiro",
    title: "Lavar piso com desinfetante",
    estimated_minutes: 15,
    frequency_type: "weekly",
    min_level: "equilibrada",
    priority: "media",
  },
  {
    id: "banheiro_limpar_rejunte",
    room_type: "banheiro",
    title: "Limpar rejunte das paredes",
    estimated_minutes: 30,
    frequency_type: "monthly",
    min_level: "detalhada",
    priority: "media",
  },
  {
    id: "lavanderia_lavar_roupas",
    room_type: "lavanderia",
    title: "Lavar roupas",
    estimated_minutes: 60,
    frequency_type: "weekly",
    min_level: "leve",
    priority: "alta",
  },
  {
    id: "lavanderia_dobrar_roupas",
    room_type: "lavanderia",
    title: "Dobrar e guardar roupas",
    estimated_minutes: 30,
    frequency_type: "weekly",
    min_level: "equilibrada",
    priority: "alta",
  },
  {
    id: "lavanderia_limpar_maquina",
    room_type: "lavanderia",
    title: "Limpar máquina de lavar",
    estimated_minutes: 20,
    frequency_type: "monthly",
    min_level: "detalhada",
    priority: "media",
  },
];

export function filterCatalog(
  rooms: RoomType[],
  level: RoutineLevel,
  availableMinutes: number,
): CatalogTask[] {
  if (availableMinutes <= 0) return [];

  const eligible = CATALOG.filter(
    (t) =>
      rooms.includes(t.room_type) &&
      LEVEL_ORDER[t.min_level] <= LEVEL_ORDER[level],
  ).sort((a, b) => a.estimated_minutes - b.estimated_minutes);

  const result: CatalogTask[] = [];
  let sum = 0;
  const seenRooms = new Set<RoomType>();

  for (const task of eligible) {
    if (sum + task.estimated_minutes <= availableMinutes) {
      result.push(task);
      sum += task.estimated_minutes;
      seenRooms.add(task.room_type);
    } else if (!seenRooms.has(task.room_type)) {
      result.push(task);
      sum += task.estimated_minutes;
      seenRooms.add(task.room_type);
    }
  }

  return result;
}
