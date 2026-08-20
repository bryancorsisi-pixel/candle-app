import { NextResponse } from 'next/server';
import { getSupabaseServerClient, getSupabaseAdminClient } from '../../../../lib/supabaseServer';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const supabase = getSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

    const { friendship_id, action } = await request.json();
    if (!friendship_id || !['accept', 'decline', 'cancel'].includes(action)) {
      return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 });
    }

    const admin = getSupabaseAdminClient();
    const { data: friendship, error: fetchError } = await admin
      .from('friendships')
      .select('*')
      .eq('id', friendship_id)
      .maybeSingle();
    if (fetchError) throw fetchError;
    if (!friendship) return NextResponse.json({ error: 'Pedido não encontrado.' }, { status: 404 });

    if (action === 'accept') {
      if (friendship.friend_id !== user.id) {
        return NextResponse.json({ error: 'Só quem recebeu o pedido pode aceitar.' }, { status: 403 });
      }
      await admin
        .from('friendships')
        .update({ status: 'accepted', respondido_em: new Date().toISOString() })
        .eq('id', friendship_id);
    } else if (action === 'decline') {
      if (friendship.friend_id !== user.id) {
        return NextResponse.json({ error: 'Só quem recebeu o pedido pode recusar.' }, { status: 403 });
      }
      await admin.from('friendships').delete().eq('id', friendship_id);
    } else if (action === 'cancel') {
      if (friendship.user_id !== user.id) {
        return NextResponse.json({ error: 'Só quem enviou o pedido pode cancelar.' }, { status: 403 });
      }
      await admin.from('friendships').delete().eq('id', friendship_id);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Erro em /api/friends/respond:', err);
    return NextResponse.json({ error: 'Erro ao responder pedido.' }, { status: 500 });
  }
}
