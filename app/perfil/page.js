import { redirect } from 'next/navigation';
import { getCurrentUserAndProfile } from '../../lib/supabaseServer';
import PerfilClient from './PerfilClient';

export default async function PerfilPage() {
  const { user, profile } = await getCurrentUserAndProfile();
  if (!user) redirect('/');
  if (!profile) redirect('/onboarding');

  return <PerfilClient profile={profile} />;
}
