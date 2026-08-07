import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '../../../../lib/supabaseClient';
import { buildQuizComposition, ALL_AREAS } from '../../../../lib/labels';

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const areaInteresse = searchParams.get('area') || 'indefinido';

    const supabase = getSupabaseServerClient();
    const comp = buildQuizComposition(areaInteresse);

    const selected = [];

    for (const area of ALL_AREAS) {
      for (const nivel of ['basica', 'avancada']) {
        const qtd = comp[area][nivel];
        if (qtd === 0) continue;

        const { data, error } = await supabase
          .from('questions')
          .select('id, area, nivel, enunciado, opcao_a, opcao_b, opcao_c, opcao_d, correta')
          .eq('area', area)
          .eq('nivel', nivel)
          .eq('ativa', true);

        if (error) throw error;

        const escolhidas = shuffle(data).slice(0, qtd);
        selected.push(...escolhidas);
      }
    }

    return NextResponse.json({ questions: shuffle(selected) });
  } catch (err) {
    console.error('Erro em /api/quiz/questions:', err);
    return NextResponse.json({ error: 'Erro ao sortear perguntas.' }, { status: 500 });
  }
}
