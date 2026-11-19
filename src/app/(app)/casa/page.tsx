import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/require-user";
import { getHomeWithRooms, getRoutinesCount } from "@/features/homes/queries";
import { PageHeader } from "@/components/feedback/page-header";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Minha casa" };

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  apartamento: "Apartamento",
  casa: "Casa",
  sobrado: "Sobrado",
  studio_kitnet: "Studio/Kitnet",
  outro: "Outro",
};

const OWNERSHIP_TYPE_LABELS: Record<string, string> = {
  proprio: "Próprio",
  alugado: "Alugado",
  outro: "Outro",
};

const HOUSEHOLD_TYPE_LABELS: Record<string, string> = {
  sozinho: "Sozinho",
  casal: "Casal",
  familia: "Família",
  compartilhada: "Compartilhada",
  outro: "Outro",
};

export default async function Page() {
  const user = await requireUser();
  const home = await getHomeWithRooms(user.id);

  if (!home) {
    redirect("/onboarding");
  }

  const routinesCount = await getRoutinesCount(home.id);

  return (
    <>
      <PageHeader
        title={home.name}
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/casa/editar">Editar dados</Link>
          </Button>
        }
      />

      {/* Resumo da residência */}
      <section className="mb-6">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4 text-sm">
          <div>
            <dt className="text-muted-foreground">Tipo</dt>
            <dd className="font-medium">{PROPERTY_TYPE_LABELS[home.property_type] ?? home.property_type}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Posse</dt>
            <dd className="font-medium">{OWNERSHIP_TYPE_LABELS[home.ownership_type] ?? home.ownership_type}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Composição</dt>
            <dd className="font-medium">{HOUSEHOLD_TYPE_LABELS[home.household_type] ?? home.household_type}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Moradores</dt>
            <dd className="font-medium">{home.resident_count}</dd>
          </div>
        </dl>
      </section>

      {/* Cards de stats */}
      <section className="grid gap-4 sm:grid-cols-3">
        {/* Cômodos */}
        <div className="border rounded-xl p-4 space-y-1">
          <p className="text-muted-foreground text-xs uppercase tracking-wide">Cômodos</p>
          <p className="text-2xl font-semibold">{home.rooms.length}</p>
          <Button asChild variant="link" size="sm" className="p-0 h-auto text-xs">
            <Link href="/casa/comodos">Ver cômodos →</Link>
          </Button>
        </div>

        {/* Tarefas */}
        <div className="border rounded-xl p-4 space-y-1">
          <p className="text-muted-foreground text-xs uppercase tracking-wide">Tarefas da rotina</p>
          <p className="text-2xl font-semibold">{routinesCount}</p>
          <Button asChild variant="link" size="sm" className="p-0 h-auto text-xs">
            <Link href="/rotina">Ver rotina →</Link>
          </Button>
        </div>

        {/* Membros */}
        <div className="border rounded-xl p-4 space-y-1">
          <p className="text-muted-foreground text-xs uppercase tracking-wide">Membros</p>
          <Button asChild variant="link" size="sm" className="p-0 h-auto text-xs">
            <Link href="/casa/membros">Ver membros →</Link>
          </Button>
        </div>
      </section>
    </>
  );
}
