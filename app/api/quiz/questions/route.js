import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '../../../../lib/supabaseServer';
import { buildQuizComposition, ALL_AREAS } from '../../../../lib/labels';
import { shuffle } from '../../../../lib/util';

export const dynamic = 'force-dynamic';

// Diagnóstico gratuito (triagem). Devolve as perguntas SEM a coluna
// `correta` — a correção acontece no servidor, em /api/quiz/submit, pra
// nunca vazar o gabarito no Network tab do navegador antes de responder.
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const areaInteresse = searchParams.get('area') || 'indefinido';

    const admin = getSupabaseAdminClient();
    const comp = buildQuizComposition(areaInteresse);

    const selected = [];

    for (const area of ALL_AREAS) {
      for (const nivel of ['conceito', 'aplicacao']) {
        const qtd = comp[area][nivel];
        if (!qtd) continue;

        const { data, error } = await admin
          .from('questions')
          .select('id, area, nivel, enunciado, opcao_a, opcao_b, opcao_c, opcao_d')
          .eq('area', area)
          .eq('nivel', nivel)
          .eq('ativa', true);

        if (error) throw error;

        selected.push(...shuffle(data || []).slice(0, qtd));
      }
    }

    return NextResponse.json({ questions: shuffle(selected) });
  } catch (err) {
    console.error('Erro em /api/quiz/questions:', err);
    return NextResponse.json({ error: 'Erro ao sortear perguntas.' }, { status: 500 });
  }
}
