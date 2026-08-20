import { NextResponse } from 'next/server';
import { getSupabaseServerClient, getSupabaseAdminClient } from '../../../../lib/supabaseServer';

export const dynamic = 'force-dynamic';

async function accuracyFor(admin, userId) {
  const { data: attempts } = await admin
    .from('quiz_attempts')
    .select('id')
    .eq('user_id', userId);
  const attemptIds = (attempts || []).map((a) => a.id);
  if (attemptIds.length === 0) return { acertos: 0, total: 0, pct: null };

  const { data: answers } = await admin
    .from('quiz_answers')
    .select('correta')
    .in('attempt_id', attemptIds);

  const total = answers?.length || 0;
  const acertos = answers?.filter((a) => a.correta).length || 0;
  return { acertos, total, pct: total > 0 ? Math.round((acertos / total) * 100) : null };
}

// Lista amigos aceitos (com ranking por taxa de acerto) e pedidos
// pendentes recebidos/enviados (seção 7.2).
export async function GET() {
  try {
    const supabase = getSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

    const admin = getSupabaseAdminClient();
    const { data: rows, error } = await admin
      .from('friendships')
      .select('id, user_id, friend_id, status, criado_em')
      .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);
    if (error) throw error;

    const accepted = (rows || []).filter((r) => r.status === 'accepted');
    const receivedPending = (rows || []).filter((r) => r.status === 'pending' && r.friend_id === user.id);
    const sentPending = (rows || []).filter((r) => r.status === 'pending' && r.user_id === user.id);

    const otherIds = new Set();
    accepted.forEach((r) => otherIds.add(r.user_id === user.id ? r.friend_id : r.user_id));
    receivedPending.forEach((r) => otherIds.add(r.user_id));
    sentPending.forEach((r) => otherIds.add(r.friend_id));

    let profiles = {};
    if (otherIds.size > 0) {
      const { data: users } = await admin
        .from('users')
        .select('id, id_publico, nome')
        .in('id', Array.from(otherIds));
      profiles = Object.fromEntries((users || []).map((u) => [u.id, u]));
    }

    const meuDesempenho = await accuracyFor(admin, user.id);

    const ranking = await Promise.all(
      accepted.map(async (r) => {
        const otherId = r.user_id === user.id ? r.friend_id : r.user_id;
        const desempenho = await accuracyFor(admin, otherId);
        return { ...profiles[otherId], ...desempenho };
      })
    );
    ranking.push({ id: user.id, id_publico: 'você', nome: 'Você', ...meuDesempenho, souEu: true });
    ranking.sort((a, b) => (b.pct ?? -1) - (a.pct ?? -1));

    return NextResponse.json({
      ranking,
      pedidosRecebidos: receivedPending.map((r) => ({ friendship_id: r.id, ...profiles[r.user_id] })),
      pedidosEnviados: sentPending.map((r) => ({ friendship_id: r.id, ...profiles[r.friend_id] })),
    });
  } catch (err) {
    console.error('Erro em /api/friends/list:', err);
    return NextResponse.json({ error: 'Erro ao buscar amigos.' }, { status: 500 });
  }
}
