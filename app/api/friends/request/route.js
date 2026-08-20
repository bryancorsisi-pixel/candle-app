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

    const { id_publico } = await request.json();
    if (!id_publico) return NextResponse.json({ error: 'ID público obrigatório.' }, { status: 400 });

    const admin = getSupabaseAdminClient();
    const { data: target, error: targetError } = await admin
      .from('users')
      .select('id')
      .eq('id_publico', id_publico)
      .maybeSingle();
    if (targetError) throw targetError;
    if (!target) return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 });
    if (target.id === user.id) {
      return NextResponse.json({ error: 'Você não pode adicionar a si mesmo.' }, { status: 400 });
    }

    const { error: insertError } = await admin
      .from('friendships')
      .insert({ user_id: user.id, friend_id: target.id, status: 'pending' });

    if (insertError) {
      if (insertError.code === '23505') {
        return NextResponse.json({ error: 'Pedido já enviado.' }, { status: 409 });
      }
      throw insertError;
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Erro em /api/friends/request:', err);
    return NextResponse.json({ error: 'Erro ao enviar pedido.' }, { status: 500 });
  }
}
