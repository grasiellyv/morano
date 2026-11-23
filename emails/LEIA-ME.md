# Templates de e-mail do Morano (Supabase)

## Onde colar
Painel do Supabase → **Authentication → Emails → Templates** (em alguns painéis: Authentication → Email Templates). Para cada template: cole o **Assunto** e abra o arquivo `.html` correspondente, copie todo o conteúdo e cole em **Message body** (modo código/Source). Salve.

| Template do Supabase | Arquivo | Assunto |
|---|---|---|
| Confirm sign up | `confirmar-cadastro.html` | Confirme seu e-mail no Morano |
| Invite user | `convite.html` | Você foi convidado para uma casa no Morano |
| Magic Link | `link-magico.html` | Seu link de acesso ao Morano |
| Change Email Address | `troca-de-email.html` | Confirme seu novo e-mail no Morano |
| Reset Password | `redefinir-senha.html` | Redefina sua senha do Morano |
| Reauthentication | `reautenticacao.html` | Seu código de confirmação do Morano |

Variáveis do Supabase usadas (não apague as chaves duplas): `{{ .ConfirmationURL }}`, `{{ .SiteURL }}`, `{{ .Email }}`, `{{ .NewEmail }}`, `{{ .Token }}`.

## Site URL (só você pode fazer, no painel)
1. Authentication → **URL Configuration** → **Site URL**: use exatamente o mesmo valor de `NEXT_PUBLIC_SITE_URL` (ex.: `https://seu-dominio.com`, sem barra no final).
2. Em **Redirect URLs**, adicione as URLs permitidas depois do login/confirmação, por exemplo `https://seu-dominio.com/**` e, para desenvolvimento, `http://localhost:3000/**`.
3. Se o Site URL estiver diferente do app, os botões dos e-mails abrem o endereço errado.

## Se o app usa login com Next.js (SSR / PKCE)
Se o projeto tem uma rota de confirmação (por exemplo `/auth/confirm`) que troca o `token_hash` por sessão, troque o `href` do botão por:
`{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup`
(`type` muda por template: `signup`, `invite`, `magiclink`, `email_change`, `recovery`). Peça ao Claude Code no VS Code para confirmar qual rota o app usa antes de alterar.

## Observações
- O logo ainda é a palavra "Morano" em texto, como no app. Quando houver logo, troque por uma imagem hospedada (`<img>` com URL pública).
- Teste cada e-mail enviando um cadastro/recuperação real para você mesmo e abrindo no Gmail e no iPhone.
- O envio padrão do Supabase tem limite baixo de e-mails por hora; para produção configure um SMTP próprio (Authentication → SMTP Settings).
- A fonte DM Sans carrega em apps como Apple Mail; Gmail e Outlook usam Helvetica/Arial como alternativa.
