import Link from "next/link";
import { Bell } from "lucide-react";

export function NotificationBell({ unreadCount }: { unreadCount: number }) {
  const label = unreadCount > 0 ? `Notificações, ${unreadCount} ${unreadCount === 1 ? "nova" : "novas"}` : "Notificações";

  return (
    <Link
      href="/notificacoes"
      aria-label={label}
      className="relative flex size-10 items-center justify-center rounded-full border border-border no-underline"
      style={{ background: "var(--card)", color: "var(--foreground)" }}
    >
      <Bell aria-hidden size={19} strokeWidth={1.75} />
      {unreadCount > 0 ? (
        <span
          aria-hidden
          className="absolute rounded-full border-2"
          style={{ top: 9, right: 10, width: 8, height: 8, background: "#C8643C", borderColor: "var(--card)" }}
        />
      ) : null}
    </Link>
  );
}
