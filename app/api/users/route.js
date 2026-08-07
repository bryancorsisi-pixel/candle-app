import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '../../../lib/supabaseClient';

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      nome,
      email,
      faixa_etaria,
      instituicao,
      area_interesse,
      experiencia,
      objetivo,
      tempo_disponivel,
      horario_lembrete,
      consentimento_lgpd,
    } = body;

    if (!nome || !email || !consentimento_lgpd) {
      return NextResponse.json(
        { error: 'Nome, e-mail e consentimento LGPD são obrigatórios.' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServerClient();

    // upsert: se o e-mail já existe, atualiza os dados em vez de duplicar
    const { data, error } = await supabase
      .from('users')
      .upsert(
        {
          nome,
          email,
          faixa_etaria,
          instituicao,
          area_interesse,
          experiencia,
          objetivo,
          tempo_disponivel,
          horario_lembrete,
          consentimento_lgpd,
        },
        { onConflict: 'email' }
      )
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ user: data });
  } catch (err) {
    console.error('Erro em /api/users:', err);
    return NextResponse.json({ error: 'Erro ao salvar cadastro.' }, { status: 500 });
  }
}
