// Regra de acesso liberado (seção 4.1 + 5.3.2 do doc de arquitetura):
// 'active' sempre libera. 'past_due' ainda libera por 1 dia inteiro de
// tolerância depois de periodo_atual_fim, pra cobrir o caso comum de Pix
// simples (não é débito automático — a pessoa precisa escanear de novo a
// cada mês, e o webhook de vencimento pode chegar antes dela pagar).
export function hasActiveAccess(subscription) {
  if (!subscription) return false;
  if (subscription.status === 'active') return true;
  if (subscription.status === 'past_due' && subscription.periodo_atual_fim) {
    const limite = new Date(subscription.periodo_atual_fim).getTime() + 24 * 60 * 60 * 1000;
    return Date.now() <= limite;
  }
  // Cancelamento normal (seção 5.5): quem cancela continua com acesso até
  // o fim do período já pago, mesmo com status 'canceled' na nossa tabela.
  if (
    subscription.status === 'canceled' &&
    subscription.cancelamento_agendado &&
    subscription.periodo_atual_fim
  ) {
    return Date.now() <= new Date(subscription.periodo_atual_fim).getTime();
  }
  return false;
}

// Direito de arrependimento (Art. 49 CDC, seção 5.6): só nos primeiros 7
// dias corridos a partir da criação da assinatura, e só se ainda não foi
// usado.
export function withinRefundWindow(subscription) {
  if (!subscription || !subscription.criado_em) return false;
  const criado = new Date(subscription.criado_em).getTime();
  const seteDias = 7 * 24 * 60 * 60 * 1000;
  return Date.now() <= criado + seteDias;
}
