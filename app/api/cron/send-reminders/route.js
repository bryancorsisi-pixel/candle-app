import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '../../../../lib/supabaseServer';
import { sendDailyReminderEmail } from '../../../../lib/email';

export const dynamic = 'force-dynamic';

// Chamada automaticamente uma vez por hora (vercel.json) por um agendador
// externo. Protegida por CRON_SECRET — nunca deve ficar exposta sem esse
// header, senão qualquer um poderia disparar e-mail em massa pros usuários.
//
// Correção de fuso horário (seção 3): calculamos a HORA LOCAL de cada
// usuário (não a hora crua do servidor, que roda em UTC) usando o
// `fuso_horario` salvo no cadastro dele — não comparamos contra `now()` cru.
function localHourAndDate(fusoHorario) {
  const now = new Date();
  const hour = new Intl.DateTimeFormat('en-GB', {
    timeZone: fusoHorario,
    hour: '2-digit',
    hour12: false,
  }).format(now); // '16'
  const date = new Intl.DateTimeFormat('en-CA', { timeZone: fusoHorario }).format(now); // 'YYYY-MM-DD'
  return { hour, date };
}

export async function GET(request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  try {
    const admin = getSupabaseAdminClient();

    const { data: usuarios, error } = await admin
      .from('users')
      .select('id, nome, email, tempo_disponivel, horario_lembrete, fuso_horario');
    if (error) throw error;

    let enviados = 0;

    for (const user of usuarios || []) {
      const { hour, date } = localHourAndDate(user.fuso_horario || 'America/Sao_Paulo');
      const horaLembreteHora = String(user.horario_lembrete).slice(0, 2);
      if (horaLembreteHora !== hour) continue;

      const { data: jaEnviado } = await admin
        .from('email_log')
        .select('id')
        .eq('user_id', user.id)
        .eq('tipo', 'lembrete_diario')
        .gte('enviado_em', `${date}T00:00:00Z`)
        .maybeSingle();
      if (jaEnviado) continue;

      const { data: streak } = await admin
        .from('streaks')
        .select('dias_seguidos')
        .eq('user_id', user.id)
        .maybeSingle();

      await sendDailyReminderEmail(user, streak?.dias_seguidos || 0);
      await admin.from('email_log').insert({ user_id: user.id, tipo: 'lembrete_diario' });
      enviados++;
    }

    return NextResponse.json({ enviados });
  } catch (err) {
    console.error('Erro em /api/cron/send-reminders:', err);
    return NextResponse.json({ error: 'Erro ao enviar lembretes.' }, { status: 500 });
  }
}
