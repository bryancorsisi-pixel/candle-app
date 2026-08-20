import { NextResponse } from 'next/server';
import { getSupabaseServerClient, getSupabaseAdminClient } from '../../../../lib/supabaseServer';
import { ALL_AREAS } from '../../../../lib/labels';

export const dynamic = 'force-dynamic';

// Corrige o diagnóstico gratuito. Não mexe em streak — streak (seção 8 do
// doc) é definido como recompensa do treino diário pago, não da triagem.
export async function POST(request) {
  try {
    const supabase = getSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

    const body = await request.json();
    const { respostas } = body; // [{ question_id, resposta_dada }, ...]

    if (!Array.isArray(respostas) || respostas.length === 0) {
      return NextResponse.json({ error: 'Dados incompletos.' }, { status: 400 });
    }

    const admin = getSupabaseAdminClient();

    const questionIds = respostas.map((r) => r.question_id);
    const { data: perguntas, error: perguntasError } = await admin
      .from('questions')
      .select('id, area, correta')
      .in('id', questionIds);
    if (perguntasError) throw perguntasError;

    const gabarito = Object.fromEntries(perguntas.map((p) => [p.id, p]));

    const { data: attempt, error: attemptError } = await admin
      .from('quiz_attempts')
      .insert({ user_id: user.id, tipo: 'diagnostico', finalizado_em: new Date().toISOString() })
      .select()
      .single();
    if (attemptError) throw attemptError;

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

    const { error: answersError } = await admin.from('quiz_answers').insert(answersToInsert);
    if (answersError) throw answersError;

    const totalAcertos = Object.values(resultados).reduce((s, r) => s + r.acertos, 0);
    const totalPerguntas = Object.values(resultados).reduce((s, r) => s + r.total, 0);

    return NextResponse.json({ resultados, totalAcertos, totalPerguntas });
  } catch (err) {
    console.error('Erro em /api/quiz/submit:', err);
    return NextResponse.json({ error: 'Erro ao processar respostas.' }, { status: 500 });
  }
}
