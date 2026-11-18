import { requireUser } from "@/lib/auth/require-user";
import { Logo } from "@/components/brand/logo";

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  await requireUser();

  return (
    <div className="min-h-svh flex flex-col items-center justify-start px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="mb-8">
          <Logo size="lg" />
        </div>
        {children}
      </div>
    </div>
  );
}
