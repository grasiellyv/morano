import { redirect } from "next/navigation";

// Convidar agora é uma seção da página de Membros (link antigo continua funcionando).
export default function Page() {
  redirect("/casa/membros?secao=convites&novo=1");
}
