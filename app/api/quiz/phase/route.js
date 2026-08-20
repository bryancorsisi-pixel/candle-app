import { NextResponse } from 'next/server';
import { getSupabaseServerClient, getSupabaseAdminClient } from '../../../../lib/supabaseServer';
import { hasActiveAccess } from '../../../../lib/access';
import { shuffle } from '../../../../lib/util';

export const dynamic = 'force-dynamic';

const PHASE_SIZE = 10;

// Treino diário pago: devolve as 10 perguntas de uma fase específica
// (área + nível + índice da fase), sem a coluna `correta`. Exige acesso
// liberado (assinatura ativa ou dentro da tolerância de 1 dia).
export async function GET(request) {
  try {
    const supabase = getSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

    const admin = getSupabaseAdminClient();
    const { data: subscription } = await admin
      .from('subscriptions')
      .select('status, periodo_atual_fim')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!hasActiveAccess(subscription)) {
      return NextResponse.json({ error: 'Assinatura inativa.' }, { status: 402 });
    }

    const { searchParams } = new URL(request.url);
    const area = searchParams.get('area');
    const nivel = searchParams.get('nivel');
    const fase = parseInt(searchParams.get('fase') || '0', 10);

    if (!area || !nivel || Number.isNaN(fase) || fase < 0) {
      return NextResponse.json({ error: 'Parâmetros inválidos.' }, { status: 400 });
    }

    const { data, error } = await admin
      .from('questions')
      .select('id, area, nivel, enunciado, opcao_a, opcao_b, opcao_c, opcao_d')
      .eq('area', area)
      .eq('nivel', nivel)
      .eq('ativa', true)
      .order('id') // ordem estável, pra "fase 0" sempre ser o mesmo recorte de 10
      .range(fase * PHASE_SIZE, fase * PHASE_SIZE + PHASE_SIZE - 1);

    if (error) throw error;

    return NextResponse.json({ questions: shuffle(data || []) });
  } catch (err) {
    console.error('Erro em /api/quiz/phase:', err);
    return NextResponse.json({ error: 'Erro ao buscar perguntas da fase.' }, { status: 500 });
  }
}
