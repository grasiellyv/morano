import { redirect } from "next/navigation";

// Etapa 2: a autenticação decidirá entre onboarding e o app.
export default function Home() {
  redirect("/inicio");
}
