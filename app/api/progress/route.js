import { NextResponse } from 'next/server';
import { getSupabaseServerClient, getSupabaseAdminClient } from '../../../lib/supabaseServer';

export const dynamic = 'force-dynamic';

// Progresso do treino diário: pra cada (área, nível, fase), devolve o
// resultado da tentativa mais recente. O frontend usa isso pra desenhar o
// mapa de fases (concluída / desbloqueada / bloqueada) e a aba Progresso.
export async function GET() {
  try {
    const supabase = getSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

    const admin = getSupabaseAdminClient();

    const { data: attempts, error: attemptsError } = await admin
      .from('quiz_attempts')
      .select('id, area, nivel, fase, finalizado_em')
      .eq('user_id', user.id)
      .eq('tipo', 'treino_diario')
      .not('finalizado_em', 'is', null)
      .order('finalizado_em', { ascending: true });
    if (attemptsError) throw attemptsError;

    const latestByPhase = {};
    for (const a of attempts || []) {
      latestByPhase[`${a.area}_${a.nivel}_${a.fase}`] = a.id; // mantém sempre a mais recente (ordenado asc)
    }

    const attemptIds = Object.values(latestByPhase);
    let scoresByAttempt = {};
    if (attemptIds.length > 0) {
      const { data: answers, error: answersError } = await admin
        .from('quiz_answers')
        .select('attempt_id, correta')
        .in('attempt_id', attemptIds);
      if (answersError) throw answersError;

      scoresByAttempt = answers.reduce((acc, ans) => {
        acc[ans.attempt_id] = acc[ans.attempt_id] || { acertos: 0, total: 0 };
        acc[ans.attempt_id].total += 1;
        if (ans.correta) acc[ans.attempt_id].acertos += 1;
        return acc;
      }, {});
    }

    const progress = {};
    for (const [key, attemptId] of Object.entries(latestByPhase)) {
      progress[key] = scoresByAttempt[attemptId] || { acertos: 0, total: 0 };
    }

    return NextResponse.json({ progress, phasesPerLevel: 10 });
  } catch (err) {
    console.error('Erro em /api/progress:', err);
    return NextResponse.json({ error: 'Erro ao buscar progresso.' }, { status: 500 });
  }
}
