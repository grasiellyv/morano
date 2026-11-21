/**
 * Cria uma residência para e2e@morano.test para que o global-setup
 * consiga chegar em /inicio sem ser redirecionado para onboarding.
 * Executar de C:\Users\Rafa\Documents\Morano App:
 *   node setup-e2e-user.cjs
 */
const { loadEnvConfig } = require('@next/env');
loadEnvConfig(process.cwd());
const { createClient } = require('@supabase/supabase-js');

const E2E_EMAIL = 'e2e@morano.test';
const E2E_PASSWORD = 'Morano123';

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error('Env vars NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SECRET_KEY não encontrados em .env.local');

  const admin = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  // 1. Encontrar ou criar o usuário e2e@morano.test
  let userId;
  for (let pg = 1; pg < 20; pg++) {
    const { data, error } = await admin.auth.admin.listUsers({ page: pg, perPage: 200 });
    if (error) throw error;
    const found = data.users.find(u => u.email === E2E_EMAIL);
    if (found) { userId = found.id; break; }
    if (data.users.length < 200) break;
  }

  if (!userId) {
    console.log('Criando usuário e2e@morano.test...');
    const { data, error } = await admin.auth.admin.createUser({
      email: E2E_EMAIL,
      password: E2E_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: 'E2E Teste', terms_accepted: 'true' }
    });
    if (error) throw error;
    userId = data.user.id;
  } else {
    console.log('Usuário encontrado:', userId);
    await admin.auth.admin.updateUserById(userId, { password: E2E_PASSWORD, email_confirm: true });
  }

  // 2. Verificar se profile existe e tem home
  const { data: profile } = await admin.from('profiles').select('*').eq('id', userId).maybeSingle();
  console.log('Profile:', profile ? `current_home_id=${profile.current_home_id}` : 'NOT FOUND');

  if (profile?.current_home_id) {
    // Verifica se a home ainda existe
    const { data: existingHome } = await admin.from('homes').select('id').eq('id', profile.current_home_id).maybeSingle();
    if (existingHome) {
      if (!profile.onboarding_completed) {
        await admin.from('profiles').update({ onboarding_completed: true }).eq('id', userId);
        console.log('onboarding_completed atualizado para true.');
      } else {
        console.log('Usuário já tem residência válida e onboarding completo. Nada a fazer.');
      }
      return;
    }
    console.log('Home não existe mais. Criando nova...');
  }

  // 3. Criar uma residência
  const { data: home, error: homeErr } = await admin.from('homes').insert({
    name: 'Casa E2E Setup',
    property_type: 'apartamento',
    ownership_type: 'proprio',
    household_type: 'sozinho',
    resident_count: 1,
    timezone: 'America/Sao_Paulo'
  }).select().single();
  if (homeErr) throw homeErr;
  console.log('Home criada:', home.id);

  // 4. Criar home_member para o usuário (ou atualizar se já existe)
  await admin.from('home_members').upsert({
    home_id: home.id,
    user_id: userId,
    role: 'owner'
  });
  console.log('home_member criado/atualizado');

  // 5. Criar room "Sala"
  const { error: roomErr } = await admin.from('rooms').insert({
    home_id: home.id,
    name: 'Sala',
    room_type: 'sala'
  });
  if (roomErr) console.warn('Room error (non-fatal):', roomErr.message);

  // 6. Atualizar ou criar profile com current_home_id e onboarding_completed
  if (profile) {
    await admin.from('profiles').update({
      current_home_id: home.id,
      onboarding_completed: true
    }).eq('id', userId);
    console.log('Profile atualizado com current_home_id =', home.id, 'e onboarding_completed = true');
  } else {
    await admin.from('profiles').upsert({
      id: userId,
      current_home_id: home.id,
      full_name: 'E2E Teste',
      onboarding_completed: true
    });
    console.log('Profile criado com current_home_id =', home.id, 'e onboarding_completed = true');
  }

  console.log('✓ Setup concluído!');
}

main().catch(e => { console.error('ERRO:', e.message || e); process.exit(1); });
