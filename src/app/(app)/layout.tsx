import { AppShell } from "@/components/layout/app-shell";
import { requireUser } from "@/lib/auth/require-user";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // O proxy já redireciona; aqui a sessão é verificada de novo no servidor (spec §7).
  await requireUser();
  return <AppShell>{children}</AppShell>;
}
