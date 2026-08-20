import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '../../../../lib/supabaseServer';
import { getSubscription, isValidAsaasWebhook } from '../../../../lib/asaas';
import { sendWelcomeEmail } from '../../../../lib/email';

export const dynamic = 'force-dynamic';

// Fonte de verdade do pagamento (seção 5.2-5.3). O navegador do usuário
// nunca libera acesso sozinho — só este webhook, validado pelo token
// configurado no cadastro do webhook no painel do Asaas.
export async function POST(request) {
  if (!isValidAsaasWebhook(request)) {
    return NextResponse.json({ error: 'Token inválido.' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const event = body.event;
    const payment = body.payment;
    if (!payment?.subscription) {
      return NextResponse.json({ ok: true, ignorado: 'sem assinatura vinculada' });
    }

    const admin = getSupabaseAdminClient();
    const { data: subscription } = await admin
      .from('subscriptions')
      .select('*, users:user_id(*)')
      .eq('asaas_subscription_id', payment.subscription)
      .maybeSingle();

    if (!subscription) {
      return NextResponse.json({ ok: true, ignorado: 'assinatura não encontrada localmente' });
    }

    if (event === 'PAYMENT_CONFIRMED' || event === 'PAYMENT_RECEIVED') {
      const wasFirstActivation = subscription.status !== 'active';

      // Confirmamos o fim do ciclo atual consultando a própria assinatura
      // no Asaas (nextDueDate), em vez de calcular "+30 dias" na mão —
      // seção 5.3.1, evita desalinhar em meses com número de dias diferente.
      const asaasSub = await getSubscription(payment.subscription);
      const periodoAtualFim = asaasSub.nextDueDate;

      await admin
        .from('subscriptions')
        .update({
          status: 'active',
          periodo_atual_fim: periodoAtualFim,
          cancelamento_agendado: false,
          atualizado_em: new Date().toISOString(),
        })
        .eq('id', subscription.id);

      if (wasFirstActivation && subscription.users) {
        const { data: jaEnviado } = await admin
          .from('email_log')
          .select('id')
          .eq('user_id', subscription.user_id)
          .eq('tipo', 'boas_vindas')
          .maybeSingle();
        if (!jaEnviado) {
          await sendWelcomeEmail(subscription.users);
          await admin.from('email_log').insert({ user_id: subscription.user_id, tipo: 'boas_vindas' });
        }
      }
    } else if (event === 'PAYMENT_OVERDUE') {
      await admin
        .from('subscriptions')
        .update({ status: 'past_due', atualizado_em: new Date().toISOString() })
        .eq('id', subscription.id);
    } else if (event === 'PAYMENT_DELETED') {
      await admin
        .from('subscriptions')
        .update({ status: 'canceled', cancelamento_agendado: false, atualizado_em: new Date().toISOString() })
        .eq('id', subscription.id);
    } else if (event === 'PAYMENT_REFUNDED') {
      await admin
        .from('subscriptions')
        .update({ status: 'canceled', cancelamento_agendado: false, atualizado_em: new Date().toISOString() })
        .eq('id', subscription.id);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Erro em /api/asaas/webhook:', err);
    return NextResponse.json({ error: 'Erro ao processar webhook.' }, { status: 500 });
  }
}
