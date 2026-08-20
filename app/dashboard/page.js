import { redirect } from 'next/navigation';
import { getCurrentUserAndProfile, getSupabaseAdminClient } from '../../lib/supabaseServer';
import { hasActiveAccess } from '../../lib/access';
import DashboardClient from './DashboardClient';

export default async function DashboardPage() {
  const { user, profile } = await getCurrentUserAndProfile();
  if (!user) redirect('/');
  if (!profile) redirect('/onboarding');

  const admin = getSupabaseAdminClient();
  const { data: subscription } = await admin
    .from('subscriptions')
    .select('status, periodo_atual_fim, cancelamento_agendado')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!hasActiveAccess(subscription)) redirect('/assinar');

  return <DashboardClient profile={profile} />;
}
