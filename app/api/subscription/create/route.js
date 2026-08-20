import { NextResponse } from 'next/server';
import { getSupabaseServerClient, getSupabaseAdminClient } from '../../../../lib/supabaseServer';
import { createOrGetAsaasCustomer, createPixSubscription, listSubscriptionPayments, getPixQrCode } from '../../../../lib/asaas';

export const dynamic = 'force-dynamic';

const PRECO_MENSAL = 11.9;

// Cria (ou retoma) a assinatura mensal via Pix no Asaas e devolve o QR code
// da primeira cobrança (seção 5.2). Trata o caso de menor de idade (seção
// 4.5, opção 1: checkbox de confirmação antes de liberar o pagamento).
export async function POST(request) {
  try {
    const supabase = getSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

    const admin = getSupabaseAdminClient();
    const { data: profile } = await admin.from('users').select('*').eq('id', user.id).maybeSingle();
    if (!profile) return NextResponse.json({ error: 'Termine a triagem antes de assinar.' }, { status: 400 });

    const body = await request.json().catch(() => ({}));
    const maiorIdadeConfirmado = !!body.maior_idade_confirmado;

    if (profile.faixa_etaria === '<18' && !profile.maior_idade_confirmado && !maiorIdadeConfirmado) {
      return NextResponse.json(
        { error: 'menor_idade', message: 'Confirme que você é maior de idade ou tem autorização de um responsável.' },
        { status: 400 }
      );
    }
    if (maiorIdadeConfirmado && !profile.maior_idade_confirmado) {
      await admin.from('users').update({ maior_idade_confirmado: true }).eq('id', user.id);
    }

    const { data: existingSub } = await admin
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingSub?.status === 'active') {
      return NextResponse.json({ error: 'Você já tem uma assinatura ativa.' }, { status: 409 });
    }

    const customer = await createOrGetAsaasCustomer({
      name: profile.nome,
      email: profile.email,
      externalReference: user.id,
    });

    let asaasSubscriptionId = existingSub?.asaas_subscription_id;
    if (!asaasSubscriptionId) {
      const sub = await createPixSubscription({
        customerId: customer.id,
        value: PRECO_MENSAL,
        externalReference: user.id,
      });
      asaasSubscriptionId = sub.id;
    }

    if (existingSub) {
      await admin
        .from('subscriptions')
        .update({
          asaas_customer_id: customer.id,
          asaas_subscription_id: asaasSubscriptionId,
          status: 'incomplete',
          atualizado_em: new Date().toISOString(),
        })
        .eq('user_id', user.id);
    } else {
      await admin.from('subscriptions').insert({
        user_id: user.id,
        asaas_customer_id: customer.id,
        asaas_subscription_id: asaasSubscriptionId,
        status: 'incomplete',
      });
    }

    const payments = await listSubscriptionPayments(asaasSubscriptionId);
    const payment = payments?.data?.[0];
    if (!payment) throw new Error('Cobrança não foi gerada pelo Asaas.');

    const qrCode = await getPixQrCode(payment.id);

    return NextResponse.json({
      paymentId: payment.id,
      qrCode: { encodedImage: qrCode.encodedImage, payload: qrCode.payload, expirationDate: qrCode.expirationDate },
      value: PRECO_MENSAL,
    });
  } catch (err) {
    console.error('Erro em /api/subscription/create:', err);
    return NextResponse.json({ error: err.message || 'Erro ao gerar cobrança Pix.' }, { status: 500 });
  }
}
