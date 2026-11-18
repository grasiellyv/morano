/** Texto da tela de confirmação; também usado quando o e-mail já existe (sem revelar contas). */
export const SIGN_UP_NEUTRAL_MESSAGE =
  "Enviamos um link para o seu e-mail. Abra-o neste aparelho para continuar.";

export const PASSWORD_RESET_NEUTRAL_MESSAGE =
  "Se houver uma conta com esse e-mail, enviamos um link.";

/** Link de confirmação ou recuperação expirado, já usado ou inválido. */
export const LINK_INVALID_MESSAGE = "O link expirou ou já foi usado. Peça um novo.";

export const DEFAULT_AUTH_ERROR = "Não foi possível concluir. Tente novamente.";

const MESSAGES: Record<string, string> = {
  invalid_credentials: "E-mail ou senha incorretos.",
  email_not_confirmed: "Confirme seu e-mail antes de entrar. Reenviamos o link.",
  user_already_exists: SIGN_UP_NEUTRAL_MESSAGE,
  weak_password: "Escolha uma senha mais forte.",
  same_password: "Escolha uma senha diferente da atual.",
  over_email_send_rate_limit: "Muitas tentativas. Aguarde alguns minutos.",
};

/** Traduz o código de erro do Supabase Auth para uma mensagem amigável em pt-BR. */
export function authErrorMessage(code: string | undefined): string {
  if (code && Object.hasOwn(MESSAGES, code)) return MESSAGES[code]!;
  return DEFAULT_AUTH_ERROR;
}
