import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getSupabaseServerClient } from '../../../../lib/supabaseClient';
import { TEMPO_LABELS } from '../../../../lib/labels';

// Esta rota é feita pra ser chamada automaticamente a cada 15 minutos por um
// agendador externo (Vercel Cron, GitHub Actions, ou cron-job.org).
// Ela NÃO deve ser exposta publicamente sem proteção — por isso checamos o
// header "Authorization" contra o CRON_SECRET antes de fazer qualquer coisa.

export async function GET(request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  try {
    const supabase = getSupabaseServerClient();
    const resend = new Resend(process.env.RESEND_API_KEY);

    // Horário atual no formato 'HH:MM' (arredondado pro slot de 15 em 15 min
    // mais próximo, já que os horários oferecidos no onboarding são fixos:
    // 08:00, 12:00, 16:00, 20:00)
    const agora = new Date();
    const horaAtual = `${String(agora.getHours()).padStart(2, '0')}:00`;
    const hoje = agora.toISOString().slice(0, 10);

    // Busca usuários cujo horário de lembrete bate com a hora atual
    const { data: usuarios, error: usuariosError } = await supabase
      .from('users')
      .select('id, nome, email, tempo_disponivel, horario_lembrete')
      .eq('horario_lembrete', horaAtual);

    if (usuariosError) throw usuariosError;
    if (!usuarios || usuarios.length === 0) {
      return NextResponse.json({ enviados: 0, motivo: 'Nenhum usuário nesse horário.' });
    }

    let enviados = 0;

    for (const user of usuarios) {
      // Confere se já mandamos e-mail pra essa pessoa hoje (evita duplicidade
      // se o cron rodar mais de uma vez na mesma janela de horário)
      const { data: jaEnviado } = await supabase
        .from('email_log')
        .select('id')
        .eq('user_id', user.id)
        .eq('tipo', 'lembrete_diario')
        .gte('enviado_em', `${hoje}T00:00:00`)
        .maybeSingle();

      if (jaEnviado) continue;

      const primeiroNome = user.nome.split(' ')[0];
      const tempoTexto = TEMPO_LABELS[user.tempo_disponivel] || 'alguns minutos';

      await resend.emails.send({
        from: 'Candle <lembrete@candleapp.com.br>',
        to: user.email,
        subject: '🕯️ Hora do seu treino diário',
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
            <h2>Oi, ${primeiroNome}! 🕯️</h2>
            <p>Chegou a hora do seu treino diário no Candle — são ${tempoTexto}, só isso.</p>
            <p>Mantenha sua vela acesa hoje também.</p>
            <a href="https://candleapp.com.br/treino"
               style="display:inline-block; background:#34D399; color:#06251A; padding:12px 20px; border-radius:10px; text-decoration:none; font-weight:600;">
              Fazer meu treino agora →
            </a>
          </div>
        `,
      });

      await supabase.from('email_log').insert({ user_id: user.id, tipo: 'lembrete_diario' });
      enviados++;
    }

    return NextResponse.json({ enviados });
  } catch (err) {
    console.error('Erro em /api/cron/send-reminders:', err);
    return NextResponse.json({ error: 'Erro ao enviar lembretes.' }, { status: 500 });
  }
}
