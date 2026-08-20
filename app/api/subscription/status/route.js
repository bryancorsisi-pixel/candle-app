import { NextResponse } from 'next/server';
import { getSupabaseServerClient, getSupabaseAdminClient } from '../../../../lib/supabaseServer';
import { hasActiveAccess, withinRefundWindow } from '../../../../lib/access';

export const dynamic = 'force-dynamic';

// Usado pela tela de checkout pra saber quando o webhook confirmou o
// pagamento (poll simples a cada poucos segundos) e pelo perfil pra
// decidir se mostra o botão de reembolso dos 7 dias.
export async function GET() {
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

    return NextResponse.json({
      subscription,
      hasAccess: hasActiveAccess(subscription),
      withinRefundWindow: withinRefundWindow(subscription),
    });
  } catch (err) {
    console.error('Erro em /api/subscription/status:', err);
    return NextResponse.json({ error: 'Erro ao consultar assinatura.' }, { status: 500 });
  }
}
