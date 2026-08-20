import { NextResponse } from 'next/server';
import { getSupabaseServerClient, getSupabaseAdminClient } from '../../../../lib/supabaseServer';

export const dynamic = 'force-dynamic';

// Busca por nome, ID público (CNDL-XXXX) ou e-mail exato (seção 7.2). Só
// retorna gente com buscavel_por_nome = true, exceto quando a busca é por
// e-mail exato — quem já sabe o e-mail de alguém já tem uma forma de
// contato direto, então não é uma nova exposição de privacidade.
export async function GET(request) {
  try {
    const supabase = getSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const termo = (searchParams.get('q') || '').trim();
    if (termo.length < 2) return NextResponse.json({ results: [] });

    const admin = getSupabaseAdminClient();
    const isEmailExato = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(termo);

    let query = admin
      .from('users')
      .select('id, id_publico, nome, area_interesse')
      .neq('id', user.id)
      .limit(10);

    if (isEmailExato) {
      query = query.eq('email', termo.toLowerCase());
    } else {
      query = query
        .eq('buscavel_por_nome', true)
        .or(`nome.ilike.%${termo}%,id_publico.ilike.%${termo}%`);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Marca quem já é amigo ou já tem pedido pendente, pra não duplicar o
    // botão de "adicionar" na interface.
    const ids = data.map((u) => u.id);
    let existing = [];
    if (ids.length > 0) {
      const { data: fs } = await admin
        .from('friendships')
        .select('user_id, friend_id, status')
        .or(
          `and(user_id.eq.${user.id},friend_id.in.(${ids.join(',')})),and(friend_id.eq.${user.id},user_id.in.(${ids.join(',')}))`
        );
      existing = fs || [];
    }

    const results = data.map((u) => {
      const rel = existing.find((f) => f.user_id === u.id || f.friend_id === u.id);
      return {
        id_publico: u.id_publico,
        nome: u.nome,
        status: rel ? rel.status : null,
      };
    });

    return NextResponse.json({ results });
  } catch (err) {
    console.error('Erro em /api/friends/search:', err);
    return NextResponse.json({ error: 'Erro ao buscar.' }, { status: 500 });
  }
}
