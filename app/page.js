import { redirect } from 'next/navigation';
import { getCurrentUserAndProfile, getSupabaseAdminClient } from '../lib/supabaseServer';
import { hasActiveAccess } from '../lib/access';
import LandingClient from './LandingClient';

// Árvore de decisão de entrada (seção 4.1 do doc de arquitetura). Roda
// inteiramente no servidor, ANTES de qualquer HTML ser enviado — evita o
// "piscar" da landing ou da triagem por um instante antes de redirecionar
// quem já é cliente.
//
// 1. Sem sessão → landing.
// 2. Sessão mas sem linha em `users` → nunca terminou a triagem → /onboarding.
// 3. Perfil existe mas sem acesso liberado → /assinar (paywall).
// 4. Acesso liberado → /dashboard, direto pro progresso salvo.
export default async function Home() {
  const { user, profile } = await getCurrentUserAndProfile();

  if (!user) {
    return <LandingClient />;
  }

  if (!profile) {
    redirect('/onboarding');
  }

  const admin = getSupabaseAdminClient();
  const { data: subscription } = await admin
    .from('subscriptions')
    .select('status, periodo_atual_fim, cancelamento_agendado')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!hasActiveAccess(subscription)) {
    redirect('/assinar');
  }

  redirect('/dashboard');
}
