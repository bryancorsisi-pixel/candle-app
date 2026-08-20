import { NextResponse } from 'next/server';
import { getSupabaseServerClient, getSupabaseAdminClient } from '../../../../lib/supabaseServer';
import { cancelSubscription } from '../../../../lib/asaas';

export const dynamic = 'force-dynamic';

// Cancelamento pelo próprio usuário (seção 5.4, exigência do CDC: cancelar
// tem que ser tão fácil quanto contratar). Acesso continua até o fim do
// período já pago — ver lib/access.js.
export async function POST() {
  try {
    const supabase = getSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

    const admin = getSupabaseAdminClient();
    const { data: subscription } = await admin
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    if (!subscription?.asaas_subscription_id) {
      return NextResponse.json({ error: 'Nenhuma assinatura encontrada.' }, { status: 404 });
    }

    await cancelSubscription(subscription.asaas_subscription_id);

    await admin
      .from('subscriptions')
      .update({ status: 'canceled', cancelamento_agendado: true, atualizado_em: new Date().toISOString() })
      .eq('user_id', user.id);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Erro em /api/subscription/cancel:', err);
    return NextResponse.json({ error: err.message || 'Erro ao cancelar assinatura.' }, { status: 500 });
  }
}
