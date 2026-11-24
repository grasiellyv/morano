import Link from "next/link";
import { BellOff, CalendarClock, ShoppingBag, Wrench, type LucideIcon } from "lucide-react";
import { EmptyState } from "@/components/feedback/empty-state";
import { markAllNotificationsRead } from "@/features/notifications/actions";
import { hrefForType, type NotificationType } from "@/features/notifications/display";
import type { DayGroup } from "@/features/notifications/group-by-day";
import type { NotificationRow } from "@/features/notifications/queries";

/** Ícone pelo tipo da notificação — mesmo agrupamento visual do sininho de "Início". */
const ICON_FOR_TYPE: Record<NotificationType, LucideIcon> = {
  shopping_item_added: ShoppingBag,
  shopping_item_purchased: ShoppingBag,
  maintenance_registered: Wrench,
  task_due_today: CalendarClock,
};

type Props = {
  groups: DayGroup<NotificationRow>[];
  /** ISO — timestamp da última leitura do usuário, para o indicador de não lida por linha. */
  lastReadAt: string;
};

export function NotificationsList({ groups, lastReadAt }: Props) {
  const hasNotifications = groups.length > 0;
  const lastRead = new Date(lastReadAt);

  return (
    <>
      <div className="flex h-9 items-center gap-2">
        <h1
          className="flex-1"
          style={{ fontSize: 24, fontWeight: 400, letterSpacing: "-0.4px", color: "var(--foreground)", lineHeight: 1.2 }}
        >
          Notificações
        </h1>
        {hasNotifications ? (
          <form action={markAllNotificationsRead}>
            <button
              type="submit"
              className="text-[13px] font-medium"
              style={{ color: "var(--muted-foreground)" }}
            >
              Marcar todas como lidas
            </button>
          </form>
        ) : null}
      </div>

      {!hasNotifications ? (
        <div className="mt-4">
          <EmptyState
            icon={BellOff}
            title="Nenhuma notificação"
            description="Avisos sobre compras, manutenção e tarefas da casa aparecem aqui."
          />
        </div>
      ) : (
        <div className="mt-2 flex flex-col gap-5">
          {groups.map((group) => (
            <section key={group.label} aria-label={group.label}>
              <h2
                className="mb-1.5 px-1 text-[12px] font-semibold tracking-wide"
                style={{ color: "var(--muted-foreground)" }}
              >
                {group.label}
              </h2>
              <div
                className="overflow-hidden rounded-[16px] border border-border"
                style={{ background: "var(--card)", boxShadow: "var(--shadow)" }}
              >
                {group.items.map((item, idx) => {
                  const unread = new Date(item.created_at) > lastRead;
                  const Icon = ICON_FOR_TYPE[item.type];
                  return (
                    <Link
                      key={item.id}
                      href={hrefForType(item.type)}
                      className="flex items-center gap-3 px-3.5 no-underline"
                      style={{
                        minHeight: 60,
                        borderBottom: idx < group.items.length - 1 ? "1px solid var(--border)" : undefined,
                        color: "var(--foreground)",
                        background: unread ? "var(--secondary)" : undefined,
                      }}
                    >
                      <span
                        aria-hidden
                        className="flex shrink-0 items-center justify-center rounded-[10px]"
                        style={{ width: 34, height: 34, background: "var(--secondary)" }}
                      >
                        <Icon size={17} />
                      </span>
                      <span className="min-w-0 flex-1 py-2.5">
                        <span className="block truncate text-[14px] font-medium">
                          {item.actor_name ? `${item.actor_name} · ` : ""}
                          {item.title}
                        </span>
                        {item.meta ? (
                          <span className="block truncate text-[12px]" style={{ color: "var(--muted-foreground)" }}>
                            {item.meta}
                          </span>
                        ) : null}
                      </span>
                      {unread ? (
                        <span
                          aria-label="Não lida"
                          className="shrink-0 rounded-full"
                          style={{ width: 8, height: 8, background: "#C8643C" }}
                        />
                      ) : null}
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
