import { permanentRedirect } from "next/navigation";

/**
 * "Configurações" e "Perfil" eram duas páginas da mesma conta. Agora existe só
 * "Minha conta" (/perfil); esta rota fica para não quebrar links e favoritos antigos.
 */
export default function Page() {
  permanentRedirect("/perfil");
}
