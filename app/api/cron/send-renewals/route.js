import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '../../../../lib/supabaseServer';
import { sendRenewalEmail } from '../../../../lib/email';
import { listSubscriptionPayments, getPixQrCode } from '../../../../lib/asaas';

export const dynamic = 'force-dynamic';

// Sequência de 4 e-mails de renovação (seção 5.3.2): D-3, D-2, D-1 e no dia
// do vencimento, todos com o QR code Pix da cobrança já gerada pelo Asaas.
// Roda uma vez por hora, junto com o cron de lembrete diário.
const STAGES = [
  { dias: 3, tipo: 'renovacao_d3' },
  { dias: 2, tipo: 'renovacao_d2' },
  { dias: 1, tipo: 'renovacao_d1' },
  { dias: 0, tipo: 'renovacao_vencido' },
];

export async function GET(request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  try {
    const admin = getSupabaseAdminClient();
    const { data: subs, error } = await admin
      .from('subscriptions')
      .select('*, users:user_id(*)')
      .in('status', ['active', 'past_due'])
      .not('periodo_atual_fim', 'is', null);
    if (error) throw error;

    let enviados = 0;

    for (const sub of subs || []) {
      if (!sub.users) continue;
      const fuso = 'America/Sao_Paulo';
      const hoje = new Intl.DateTimeFormat('en-CA', { timeZone: fuso }).format(new Date());
      const vencimento = new Date(sub.periodo_atual_fim).toISOString().slice(0, 10);
      const diffDias = Math.round((new Date(vencimento) - new Date(hoje)) / (1000 * 60 * 60 * 24));

      const stage = STAGES.find((s) => s.dias === diffDias);
      if (!stage) continue;

      const { data: jaEnviado } = await admin
        .from('email_log')
        .select('id')
        .eq('user_id', sub.user_id)
        .eq('tipo', stage.tipo)
        .gte('enviado_em', `${hoje}T00:00:00Z`)
        .maybeSingle();
      if (jaEnviado) continue;

      let pixPayload = null;
      try {
        const payments = await listSubscriptionPayments(sub.asaas_subscription_id);
        const payment = payments?.data?.[0];
        if (payment) {
          const qr = await getPixQrCode(payment.id);
          pixPayload = qr.payload;
        }
      } catch (asaasErr) {
        console.error('Não foi possível buscar o QR code Pix pro e-mail de renovação:', asaasErr);
      }

      await sendRenewalEmail(sub.users, stage.tipo, pixPayload);
      await admin.from('email_log').insert({ user_id: sub.user_id, tipo: stage.tipo });
      enviados++;
    }

    return NextResponse.json({ enviados });
  } catch (err) {
    console.error('Erro em /api/cron/send-renewals:', err);
    return NextResponse.json({ error: 'Erro ao enviar e-mails de renovação.' }, { status: 500 });
  }
}
