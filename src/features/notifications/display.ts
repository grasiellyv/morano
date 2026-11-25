import type { Database } from "@/types/database";

export type NotificationType = Database["public"]["Enums"]["notification_type"];

export function hrefForType(type: NotificationType): string {
  switch (type) {
    case "shopping_item_added":
    case "shopping_item_purchased":
      return "/compras";
    case "maintenance_registered":
      return "/manutencao";
    case "task_due_today":
      return "/rotina";
  }
}

export function firstName(fullName: string | null): string {
  return fullName?.split(" ")[0] ?? "Alguém";
}
