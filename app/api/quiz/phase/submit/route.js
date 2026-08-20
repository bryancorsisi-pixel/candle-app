import { NextResponse } from 'next/server';
import { getSupabaseServerClient, getSupabaseAdminClient } from '../../../../../lib/supabaseServer';
import { hasActiveAccess } from '../../../../../lib/access';

export const dynamic = 'force-dynamic';

// Corrige uma fase do treino diário e atualiza o streak (seção 8 do doc):
// upsert que incrementa se o último treino foi ontem, mantém se já treinou
// hoje, e reseta pra 1 se ficou 2+ dias sem treinar.
export async function POST(request) {
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

    const body = await request.json();
    const { area, nivel, fase, respostas } = body;
    if (!area || !nivel || fase === undefined || !Array.isArray(respostas) || respostas.length === 0) {
      return NextResponse.json({ error: 'Dados incompletos.' }, { status: 400 });
    }

    const questionIds = respostas.map((r) => r.question_id);
    const { data: perguntas, error: perguntasError } = await admin
      .from('questions')
      .select('id, correta')
      .in('id', questionIds);
    if (perguntasError) throw perguntasError;
    const gabarito = Object.fromEntries(perguntas.map((p) => [p.id, p.correta]));

    const { data: attempt, error: attemptError } = await admin
      .from('quiz_attempts')
      .insert({
        user_id: user.id,
        tipo: 'treino_diario',
        area,
        nivel,
        fase,
        finalizado_em: new Date().toISOString(),
      })
      .select()
      .single();
    if (attemptError) throw attemptError;

    let acertos = 0;
    const answersToInsert = respostas.map((r) => {
      const correta = gabarito[r.question_id] === r.resposta_dada;
      if (correta) acertos++;
      return {
        attempt_id: attempt.id,
        question_id: r.question_id,
        resposta_dada: r.resposta_dada,
        correta,
      };
    });
    const { error: answersError } = await admin.from('quiz_answers').insert(answersToInsert);
    if (answersError) throw answersError;

    // Streak: upsert equivalente ao SQL da seção 8.1, calculado em cima do
    // fuso horário do próprio usuário (não do servidor).
    const { data: profile } = await admin
      .from('users')
      .select('fuso_horario')
      .eq('id', user.id)
      .single();
    const hoje = new Date().toLocaleDateString('en-CA', {
      timeZone: profile?.fuso_horario || 'America/Sao_Paulo',
    }); // 'en-CA' => formato YYYY-MM-DD

    const { data: streak } = await admin
      .from('streaks')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    let diasSeguidos = 1;
    if (streak) {
      if (streak.ultimo_treino_em === hoje) {
        diasSeguidos = streak.dias_seguidos;
      } else {
        const ontem = new Date(new Date(hoje).getTime() - 24 * 60 * 60 * 1000)
          .toISOString()
          .slice(0, 10);
        diasSeguidos = streak.ultimo_treino_em === ontem ? streak.dias_seguidos + 1 : 1;
      }
      await admin
        .from('streaks')
        .update({ dias_seguidos: diasSeguidos, ultimo_treino_em: hoje })
        .eq('user_id', user.id);
    } else {
      await admin.from('streaks').insert({ user_id: user.id, dias_seguidos: 1, ultimo_treino_em: hoje });
    }

    return NextResponse.json({ acertos, total: respostas.length, dias_seguidos: diasSeguidos });
  } catch (err) {
    console.error('Erro em /api/quiz/phase/submit:', err);
    return NextResponse.json({ error: 'Erro ao processar a fase.' }, { status: 500 });
  }
}
