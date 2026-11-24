import { z } from "zod";
import type { NotificationType } from "./display";

export const setNotificationPreferencesSchema = z.object({
  shopping_item_added: z.boolean(),
  shopping_item_purchased: z.boolean(),
  maintenance_registered: z.boolean(),
  task_due_today: z.boolean(),
});

export const NOTIFICATION_TYPE_LABEL: Record<NotificationType, string> = {
  shopping_item_added: "Item adicionado à lista",
  shopping_item_purchased: "Item comprado",
  maintenance_registered: "Manutenção registrada",
  task_due_today: "Tarefa com vencimento hoje",
};
