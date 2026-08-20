import { NextResponse } from 'next/server';
import { getSupabaseServerClient, getSupabaseAdminClient } from '../../../../lib/supabaseServer';
import { cancelSubscription, refundPayment, listSubscriptionPayments } from '../../../../lib/asaas';
import { withinRefundWindow } from '../../../../lib/access';

export const dynamic = 'force-dynamic';

// Direito de arrependimento — 7 dias (Art. 49 CDC, seção 5.6). Diferente do
// cancelamento normal: aqui devolve o dinheiro E revoga o acesso na hora.
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
    if (!withinRefundWindow(subscription)) {
      return NextResponse.json({ error: 'Fora da janela de 7 dias do direito de arrependimento.' }, { status: 400 });
    }

    const payments = await listSubscriptionPayments(subscription.asaas_subscription_id);
    const paid = payments?.data?.find((p) => p.status === 'CONFIRMED' || p.status === 'RECEIVED');
    if (paid) await refundPayment(paid.id);

    try {
      await cancelSubscription(subscription.asaas_subscription_id);
    } catch {
      // se a assinatura já não existir mais no Asaas, não bloqueia o resto
    }

    await admin
      .from('subscriptions')
      .update({
        status: 'canceled',
        cancelamento_agendado: false,
        atualizado_em: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Erro em /api/subscription/refund:', err);
    return NextResponse.json({ error: err.message || 'Erro ao solicitar reembolso.' }, { status: 500 });
  }
}
