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

    const { buscavel_por_nome } = await request.json();
    const admin = getSupabaseAdminClient();
    const { error } = await admin
      .from('users')
      .update({ buscavel_por_nome: !!buscavel_por_nome })
      .eq('id', user.id);
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Erro em /api/profile/findable:', err);
    return NextResponse.json({ error: 'Erro ao atualizar preferência.' }, { status: 500 });
  }
}
