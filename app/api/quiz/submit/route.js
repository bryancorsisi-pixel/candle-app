import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '../../../../lib/supabaseClient';
import { ALL_AREAS } from '../../../../lib/labels';

export async function POST(request) {
  try {
    const body = await request.json();
    const { user_id, tipo, respostas } = body;
    // respostas = [{ question_id, resposta_dada }, ...]

    if (!user_id || !Array.isArray(respostas) || respostas.length === 0) {
      return NextResponse.json({ error: 'Dados incompletos.' }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();

    // Busca o gabarito de verdade no servidor — o cliente nunca recebeu isso
    const questionIds = respostas.map((r) => r.question_id);
    const { data: perguntas, error: perguntasError } = await supabase
      .from('questions')
      .select('id, area, correta')
      .in('id', questionIds);

    if (perguntasError) throw perguntasError;

    const gabarito = Object.fromEntries(perguntas.map((p) => [p.id, p]));

    // Cria a tentativa
    const { data: attempt, error: attemptError } = await supabase
      .from('quiz_attempts')
      .insert({ user_id, tipo: tipo || 'diagnostico', finalizado_em: new Date().toISOString() })
      .select()
      .single();

    if (attemptError) throw attemptError;

    // Corrige cada resposta e monta o resultado por área
    const resultados = {};
    ALL_AREAS.forEach((a) => (resultados[a] = { acertos: 0, total: 0 }));

    const answersToInsert = respostas.map((r) => {
      const p = gabarito[r.question_id];
      const correta = p ? p.correta === r.resposta_dada : false;
      if (p) {
        resultados[p.area].total += 1;
        if (correta) resultados[p.area].acertos += 1;
      }
      return {
        attempt_id: attempt.id,
        question_id: r.question_id,
        resposta_dada: r.resposta_dada,
        correta,
      };
    });

    const { error: answersError } = await supabase.from('quiz_answers').insert(answersToInsert);
    if (answersError) throw answersError;

    // Atualiza streak: incrementa se ainda não treinou hoje
    const hoje = new Date().toISOString().slice(0, 10);
    const { data: streak } = await supabase
      .from('streaks')
      .select('*')
      .eq('user_id', user_id)
      .maybeSingle();

    if (!streak) {
      await supabase.from('streaks').insert({ user_id, dias_seguidos: 1, ultimo_treino_em: hoje });
    } else if (streak.ultimo_treino_em !== hoje) {
      await supabase
        .from('streaks')
        .update({ dias_seguidos: streak.dias_seguidos + 1, ultimo_treino_em: hoje })
        .eq('user_id', user_id);
    }

    const totalAcertos = Object.values(resultados).reduce((s, r) => s + r.acertos, 0);
    const totalPerguntas = Object.values(resultados).reduce((s, r) => s + r.total, 0);

    return NextResponse.json({ resultados, totalAcertos, totalPerguntas });
  } catch (err) {
    console.error('Erro em /api/quiz/submit:', err);
    return NextResponse.json({ error: 'Erro ao processar respostas.' }, { status: 500 });
  }
}
