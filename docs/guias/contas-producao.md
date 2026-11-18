# Guia: contas e serviços para colocar o MORANO no ar

Este guia é para você, dono do MORANO. Não precisa saber programar. Cada passo diz o que fazer e o que anotar.

**Regra de ouro:** chaves secretas, senhas e "client secrets" **nunca** são enviados em chat, e-mail ou mensagem, nem para mim. Elas são coladas direto nos painéis dos serviços ou no arquivo `.env.local` do seu computador. Se uma chave vazar, gere outra no mesmo painel e apague a antiga.

Faça na ordem. Os passos 1 a 4 são necessários antes do lançamento da versão de teste; o 5 pode esperar.

## 1. Registrar um domínio

1. Acesse o Registro.br (https://registro.br) e crie sua conta.
2. Pesquise o nome desejado com final `.com.br` (ou use outro registrador para `.com`).
3. Finalize a compra. O valor é anual.
4. Anote o domínio escolhido (por exemplo, `morano.com.br`). Ele será usado para o e-mail e para o login com Google. Nos próximos passos, `<domínio>` significa o seu.

## 2. Criar a conta e o projeto no Supabase

O Supabase guarda os dados e cuida do login.

1. Acesse https://supabase.com e crie uma conta.
2. Clique em **New project**. Escolha um nome (MORANO), crie uma senha forte para o banco (guarde em um gerenciador de senhas) e, em **Region**, escolha **South America (São Paulo) - sa-east-1**.
3. Aguarde o projeto ficar pronto. Depois, anote onde estão:
   - **URL do projeto** e **chave publicável** (Publishable key): em **Project Settings → API Keys**. A URL e a chave publicável podem aparecer no navegador sem problema.
   - **Chave secreta** (Secret key): na mesma tela. **Ela dá acesso total ao banco. Nunca envie a ninguém, nem a mim. Ela vai só para as variáveis do servidor (passo 5) e para o `.env.local`.**
4. Configure o login (**Authentication**):
   1. Em **Sign In / Providers → Email**, deixe ligado **Confirm email** (a pessoa precisa confirmar o e-mail antes de entrar).
   2. Em **URL Configuration**:
      - **Site URL**: `https://<domínio>`
      - **Redirect URLs** (lista de endereços permitidos): adicione exatamente estes três
        - `https://<domínio>/auth/callback`
        - `https://<domínio>/auth/confirm`
        - `https://<domínio>/auth/confirm?next=/redefinir-senha`
        - Alternativa mais simples: um único item `https://<domínio>/**`.
      - Sem isso, os links de confirmação e de recuperação de senha não funcionam.
   3. Em **Emails → Templates**, cole os dois modelos de e-mail do projeto. **Este passo é obrigatório:** sem ele, os links dos e-mails quebram.
      - **Confirm signup**: copie todo o conteúdo do arquivo `supabase/templates/confirmation.html` e cole no campo de conteúdo. Pode manter o assunto.
      - **Reset password**: copie todo o conteúdo de `supabase/templates/recovery.html` e cole no campo de conteúdo.
      - Clique em **Save** em cada um.
5. Quem aplica as tabelas do banco (as "migrações") sou eu, junto com você, na etapa de publicação. Você só precisa me dizer quando o projeto estiver criado.

## 3. Login com Google (Google Cloud)

1. Acesse https://console.cloud.google.com com sua conta Google e crie um projeto novo (nome: MORANO).
2. Vá em **APIs e serviços → Tela de permissão OAuth** (OAuth consent screen). Escolha **Externo**, preencha o nome do app (MORANO), seu e-mail de suporte e o domínio do passo 1. Escopos: apenas e-mail, perfil e openid.
3. Vá em **APIs e serviços → Credenciais → Criar credenciais → ID do cliente OAuth** e escolha o tipo **Aplicativo da Web**.
4. Em **URIs de redirecionamento autorizados**, informe: `https://<projeto>.supabase.co/auth/v1/callback`. O `<projeto>` é o código que aparece na URL do seu projeto no Supabase (passo 2).
5. Ao criar, o Google mostra o **ID do cliente** e a **chave secreta do cliente**.
   - O **ID do cliente** pode ser enviado a mim.
   - A **chave secreta do cliente nunca**: cole você mesmo no Supabase, em **Authentication → Sign In / Providers → Google** (ligue o provedor e preencha os dois campos).
6. Atenção: para o app aparecer para qualquer pessoa, o Google exige **verificação** da tela de permissão. Isso **pode levar dias** (às vezes semanas). Comece cedo. Enquanto não for verificado, só os "usuários de teste" que você cadastrar conseguem entrar com Google.
7. Só depois de tudo pronto, ligamos o botão no app (variável `NEXT_PUBLIC_AUTH_GOOGLE_ENABLED=true`).

## 4. E-mails do sistema (Resend)

Sem isso, o Supabase envia poucos e-mails por hora e eles podem cair no spam.

1. Crie uma conta em https://resend.com.
2. Em **Domains → Add Domain**, informe `<domínio>` (ou um subdomínio como `mail.<domínio>`).
3. O Resend mostra alguns registros DNS (SPF, DKIM). Copie-os para o painel de DNS do seu domínio (no Registro.br: **Editar zona DNS**). Volte ao Resend e clique em **Verify**. Pode levar de minutos a algumas horas.
4. Crie as credenciais SMTP (em **SMTP** ou **API Keys**). O Resend mostra servidor, porta, usuário e senha.
5. Cole esses dados no Supabase, em **Authentication → Emails → SMTP Settings** (ligue **Enable Custom SMTP**). Em "Sender email", use um endereço do seu domínio (por exemplo, `nao-responda@<domínio>`). A senha SMTP **nunca** é enviada em chat.
6. Teste: crie uma conta de teste no app publicado e confira se o e-mail de confirmação chega.

## 5. Hospedagem (Vercel)

1. Crie uma conta em https://vercel.com.
2. O plano gratuito (Hobby) **não pode ser usado para fins comerciais**. Para o MORANO cobrando assinaturas é preciso o plano **Pro**. Por isso este passo **pode esperar até a Etapa 10** (publicação); para testes locais ele não é necessário.
3. Quando chegar a hora, conectaremos o repositório e cadastraremos as variáveis de ambiente (URL do Supabase, chave publicável, chave secreta, endereço do site) direto no painel da Vercel. Nenhuma delas passa por chat.

## 6. O que me enviar (e o que nunca enviar)

**Pode enviar:**

- O domínio escolhido.
- A URL do projeto Supabase (`https://<projeto>.supabase.co`).
- O ID do cliente do Google (Client ID).
- Avisos como "a verificação do domínio no Resend deu certo" ou "o Google aprovou".

**Nunca envie (cole direto nos painéis ou no `.env.local`):**

- A chave secreta do Supabase (Secret key) e a senha do banco.
- A chave secreta do cliente do Google (Client secret).
- Senhas SMTP e chaves de API do Resend.
- Qualquer senha de conta sua.

Se algo for colado por engano em um chat, trate como vazado: gere uma chave nova no painel do serviço e apague a antiga.
