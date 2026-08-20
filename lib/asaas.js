// Wrapper fino sobre a API do Asaas (seção 5 do doc de arquitetura).
// Usa por padrão o ambiente sandbox — troque ASAAS_BASE_URL pra
// https://api.asaas.com/v3 quando for pra produção.
//
// Instrução do doc de arquitetura (seções 5.3.1 e 5.6): confirmar o nome
// exato dos campos/endpoints na documentação atual (docs.asaas.com) antes
// de operar de verdade, já que APIs de terceiros mudam de nome entre
// versões. O que está aqui reflete a documentação pública do Asaas no
// momento da implementação.

const BASE_URL = process.env.ASAAS_BASE_URL || 'https://sandbox.asaas.com/api/v3';

async function asaasFetch(path, options = {}) {
  const apiKey = process.env.ASAAS_API_KEY;
  if (!apiKey) throw new Error('ASAAS_API_KEY não configurada.');

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      access_token: apiKey,
      ...options.headers,
    },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.errors?.[0]?.description || `Erro na API do Asaas (${res.status})`;
    throw new Error(msg);
  }
  return data;
}

export async function createOrGetAsaasCustomer({ name, email, externalReference }) {
  // Asaas não tem "upsert" nativo por e-mail — buscamos primeiro pra evitar
  // duplicar cliente se a pessoa tentar assinar de novo (ex: pagamento
  // anterior falhou).
  const existing = await asaasFetch(`/customers?email=${encodeURIComponent(email)}`);
  if (existing?.data?.length > 0) return existing.data[0];

  return asaasFetch('/customers', {
    method: 'POST',
    body: JSON.stringify({ name, email, externalReference }),
  });
}

export async function createPixSubscription({ customerId, value, externalReference }) {
  return asaasFetch('/subscriptions', {
    method: 'POST',
    body: JSON.stringify({
      customer: customerId,
      billingType: 'PIX',
      cycle: 'MONTHLY',
      value,
      nextDueDate: new Date().toISOString().slice(0, 10),
      description: 'Candle — assinatura mensal',
      externalReference,
    }),
  });
}

export async function getSubscription(subscriptionId) {
  return asaasFetch(`/subscriptions/${subscriptionId}`);
}

export async function listSubscriptionPayments(subscriptionId) {
  return asaasFetch(`/payments?subscription=${subscriptionId}&limit=1&order=desc&sort=dateCreated`);
}

export async function getPixQrCode(paymentId) {
  // { encodedImage (base64 PNG), payload (copia-e-cola), expirationDate }
  return asaasFetch(`/payments/${paymentId}/pixQrCode`);
}

export async function cancelSubscription(subscriptionId) {
  return asaasFetch(`/subscriptions/${subscriptionId}`, { method: 'DELETE' });
}

export async function refundPayment(paymentId) {
  return asaasFetch(`/payments/${paymentId}/refund`, { method: 'POST' });
}

export function isValidAsaasWebhook(request) {
  const expected = process.env.ASAAS_WEBHOOK_TOKEN;
  if (!expected) return false;
  const received = request.headers.get('asaas-access-token');
  return received === expected;
}
