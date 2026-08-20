import { NextResponse } from 'next/server';
import { getSupabaseServerClient, getSupabaseAdminClient } from '../../../lib/supabaseServer';
import { generateUniquePublicId } from '../../../lib/util';

export const dynamic = 'force-dynamic';

// Grava os dados da triagem. Exige sessão do Supabase Auth já criada (a
// pessoa já verificou o código enviado pro e-mail dela) — nunca confiamos
// no e-mail vindo do corpo da requisição, sempre no da sessão autenticada.
export async function POST(request) {
  try {
    const supabase = getSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Sessão expirada. Verifique seu e-mail de novo.' }, { status: 401 });
    }

    const body = await request.json();
    const {
      nome,
      faixa_etaria,
      instituicao,
      area_interesse,
      experiencia,
      objetivo,
      tempo_disponivel,
      horario_lembrete,
      consentimento_lgpd,
    } = body;

    if (!nome || !consentimento_lgpd) {
      return NextResponse.json(
        { error: 'Nome e consentimento LGPD são obrigatórios.' },
        { status: 400 }
      );
    }

    const admin = getSupabaseAdminClient();

    const { data: existing } = await admin
      .from('users')
      .select('id_publico')
      .eq('id', user.id)
      .maybeSingle();

    const id_publico = existing?.id_publico || (await generateUniquePublicId(admin));

    const { data, error } = await admin
      .from('users')
      .upsert(
        {
          id: user.id,
          email: user.email,
          nome,
          faixa_etaria,
          instituicao,
          area_interesse,
          experiencia,
          objetivo,
          tempo_disponivel,
          horario_lembrete: horario_lembrete || '16:00',
          consentimento_lgpd,
          id_publico,
        },
        { onConflict: 'id' }
      )
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ user: data });
  } catch (err) {
    console.error('Erro em /api/onboarding:', err);
    return NextResponse.json({ error: 'Erro ao salvar cadastro.' }, { status: 500 });
  }
}
