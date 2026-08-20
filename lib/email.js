import { Resend } from 'resend';
import { firstName, TEMPO_LABELS } from './labels';

function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

// Troque pelo domínio verificado no painel do Resend (Domains) antes de
// sair do sandbox — enquanto isso, dá pra testar com o domínio de testes
// que o próprio Resend fornece.
const FROM = process.env.RESEND_FROM || 'Candle <lembrete@seudominio.com>';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

function wrapper(inner) {
  return `<div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; color:#0B1220;">${inner}</div>`;
}

function ctaButton(href, label) {
  return `<a href="${href}" style="display:inline-block; background:#34D399; color:#06251A; padding:12px 20px; border-radius:10px; text-decoration:none; font-weight:600;">${label}</a>`;
}

export async function sendWelcomeEmail(user) {
  const nome = firstName(user.nome);
  await getResend().emails.send({
    from: FROM,
    to: user.email,
    subject: '🕯️ Obrigado por assinar o Candle!',
    html: wrapper(`
      <h2>Obrigado por assinar o Candle, ${nome}!</h2>
      <p>Seu acesso já está liberado — as 1.600 perguntas, seu progresso salvo e o lembrete diário no seu horário.</p>
      <p>A gente vai te lembrar todo dia ${user.horario_lembrete ? `às ${user.horario_lembrete}` : 'no seu horário'}, exatamente como combinado na triagem.</p>
      ${ctaButton(`${SITE_URL}/dashboard`, 'Começar a treinar agora →')}
    `),
  });
}

export async function sendDailyReminderEmail(user, diasSeguidos) {
  const nome = firstName(user.nome);
  const tempoTexto = TEMPO_LABELS[user.tempo_disponivel] || 'alguns minutos';
  const streakLine =
    diasSeguidos >= 2
      ? `Você está numa sequência de ${diasSeguidos} dias — não deixa isso quebrar hoje 🔥`
      : 'Mantenha sua vela acesa hoje também.';

  await getResend().emails.send({
    from: FROM,
    to: user.email,
    subject: '🕯️ Hora do seu treino diário',
    html: wrapper(`
      <h2>Oi, ${nome}! 🕯️</h2>
      <p>Chegou a hora do seu treino diário no Candle — são ${tempoTexto}, só isso.</p>
      <p>${streakLine}</p>
      ${ctaButton(`${SITE_URL}/dashboard`, 'Fazer meu treino agora →')}
    `),
  });
}

const RENEWAL_SUBJECTS = {
  renovacao_d3: 'Sua assinatura Candle vence em 3 dias',
  renovacao_d2: 'Sua assinatura Candle vence em 2 dias',
  renovacao_d1: 'Sua assinatura Candle vence amanhã',
  renovacao_vencido: 'Sua assinatura venceu — vamos renovar agora?',
};

export async function sendRenewalEmail(user, tipo, pixPayload) {
  const nome = firstName(user.nome);
  const pixBlock = pixPayload
    ? `<p style="font-size:13px; color:#555; word-break:break-all; background:#f3f3f3; padding:10px; border-radius:8px;">Pix copia-e-cola: ${pixPayload}</p>`
    : '';

  await getResend().emails.send({
    from: FROM,
    to: user.email,
    subject: `🕯️ ${RENEWAL_SUBJECTS[tipo]}`,
    html: wrapper(`
      <h2>Oi, ${nome}!</h2>
      <p>${RENEWAL_SUBJECTS[tipo]}. Pra não perder seu progresso e sua sequência, pague a próxima cobrança via Pix.</p>
      ${pixBlock}
      ${ctaButton(`${SITE_URL}/assinar`, 'Ver cobrança e pagar →')}
    `),
  });
}
