import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/require-user";
import { getHomeWithRooms } from "@/features/homes/queries";
import { PageHeader } from "@/components/feedback/page-header";
import { Button } from "@/components/ui/button";
import { HomeForm } from "@/features/homes/components/home-form";

export const metadata: Metadata = { title: "Editar dados da casa" };

export default async function Page() {
  const user = await requireUser();
  const home = await getHomeWithRooms(user.id);

  if (!home) {
    redirect("/onboarding");
  }

  return (
    <>
      <PageHeader
        title="Editar dados"
        description={home.name}
        actions={
          <Button asChild variant="ghost" size="sm">
            <Link href="/casa" className="inline-flex items-center gap-1"><ArrowLeft size={16} aria-hidden />Voltar</Link>
          </Button>
        }
      />

      <div className="max-w-lg">
        <HomeForm
          home={{
            name: home.name,
            property_type: home.property_type,
            ownership_type: home.ownership_type,
            household_type: home.household_type,
            resident_count: home.resident_count,
          }}
        />
      </div>
    </>
  );
}
