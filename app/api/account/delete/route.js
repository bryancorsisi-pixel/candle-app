import { NextResponse } from 'next/server';
import { getSupabaseServerClient, getSupabaseAdminClient } from '../../../../lib/supabaseServer';
import { cancelSubscription, refundPayment, listSubscriptionPayments } from '../../../../lib/asaas';
import { withinRefundWindow } from '../../../../lib/access';

export const dynamic = 'force-dynamic';

// Exclusão de conta e dados (seção 4.3, direito do Art. 18 da LGPD).
// Se ainda estiver dentro da janela de 7 dias de arrependimento, também
// dispara o reembolso automaticamente (seção 5.6) — a pessoa não deveria
// precisar pedir os dois separadamente.
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

    if (subscription?.asaas_subscription_id) {
      try {
        if (withinRefundWindow(subscription)) {
          const payments = await listSubscriptionPayments(subscription.asaas_subscription_id);
          const lastPaid = payments?.data?.find((p) => p.status === 'CONFIRMED' || p.status === 'RECEIVED');
          if (lastPaid) await refundPayment(lastPaid.id);
        }
        await cancelSubscription(subscription.asaas_subscription_id);
      } catch (asaasErr) {
        // Não bloqueia a exclusão dos dados por causa de um erro no Asaas —
        // registra e segue, mas isso fica no log do servidor pra auditoria.
        console.error('Erro ao cancelar/estornar no Asaas durante exclusão de conta:', asaasErr);
      }
    }

    // Nota fiscal/contábil (seção 4.3, item 3): mantemos só a linha em
    // `subscriptions` como está (sem apagar), já anonimizada pelo apagamento
    // de `users` via ON DELETE CASCADE — não guarda nome/e-mail. Confirmar
    // com um contador se isso atende a obrigação de guarda de registros
    // fiscais antes do lançamento.

    // Apaga o perfil — ON DELETE CASCADE já remove quiz_attempts,
    // quiz_answers, streaks, email_log, subscriptions e friendships (todos
    // referenciam users(id) com on delete cascade no schema).
    const { error: deleteError } = await admin.from('users').delete().eq('id', user.id);
    if (deleteError) throw deleteError;

    const { error: authDeleteError } = await admin.auth.admin.deleteUser(user.id);
    if (authDeleteError) throw authDeleteError;

    await supabase.auth.signOut();

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Erro em /api/account/delete:', err);
    return NextResponse.json({ error: 'Erro ao excluir conta.' }, { status: 500 });
  }
}
