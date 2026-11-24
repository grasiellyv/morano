import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, PawPrint } from "lucide-react";
import { requireUser } from "@/lib/auth/require-user";
import { getHomeWithRooms } from "@/features/homes/queries";
import { createClient } from "@/lib/supabase/server";
import { getPets } from "@/features/pets/queries";
import { PageHeader } from "@/components/feedback/page-header";
import { Button } from "@/components/ui/button";
import { AddPetForm } from "@/features/pets/components/add-pet-form";
import { PetList } from "@/features/pets/components/pet-list";

export const metadata: Metadata = { title: "Animais" };

export default async function Page() {
  const user = await requireUser();
  const home = await getHomeWithRooms(user.id);
  if (!home) redirect("/onboarding");

  const supabase = await createClient();
  const pets = await getPets(supabase, home.id);

  return (
    <>
      <PageHeader
        title="Animais"
        description={
          pets.length === 0
            ? "Cuidados e necessidades"
            : `${pets.length} ${pets.length === 1 ? "animal" : "animais"} em ${home.name}`
        }
        actions={
          <Button asChild variant="ghost" size="sm">
            <Link href="/casa" className="inline-flex items-center gap-1">
              <ArrowLeft size={16} aria-hidden />
              Voltar
            </Link>
          </Button>
        }
      />

      <div className="space-y-4">
        {pets.length === 0 ? (
          <div
            className="flex flex-col items-center gap-2 rounded-[16px] border border-dashed border-border px-4 py-8 text-center"
            style={{ background: "var(--card)" }}
          >
            <span
              className="flex size-11 items-center justify-center rounded-full"
              style={{ background: "#F6DDB9", color: "#6E420F" }}
            >
              <PawPrint size={22} aria-hidden />
            </span>
            <p className="text-[15px] font-semibold">Nenhum animal ainda</p>
            <p className="text-[13px]" style={{ color: "var(--muted-foreground)" }}>
              Cadastre quem mora com vocês e anote os cuidados de cada um.
            </p>
          </div>
        ) : (
          <PetList pets={pets} />
        )}
        <AddPetForm />
      </div>
    </>
  );
}
