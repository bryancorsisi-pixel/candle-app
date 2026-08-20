'use client';

import { useRouter } from 'next/navigation';
import { usePresenceCount } from '../lib/usePresenceCount';

export default function LandingClient() {
  const router = useRouter();
  const online = usePresenceCount();

  return (
    <div className="landing">
      <div className="brand">
        candle<span style={{ color: 'var(--gain)' }}>.</span>
      </div>
      <h1>Treino diário para o mercado financeiro</h1>
      <p className="sub">
        1.600 perguntas revisadas, um lembrete no seu horário e um diagnóstico gratuito pra você
        começar agora — sem cartão de crédito.
      </p>
      <div className="landing-stat">
        <span className="online-dot" />
        {online === null ? 'carregando…' : `${online} ${online === 1 ? 'pessoa treinando' : 'pessoas treinando'} agora`}
      </div>
      <button className="landing-cta" onClick={() => router.push('/onboarding')}>
        Vamos lá →
      </button>
      <div className="landing-footer">
        <a href="/termos">Termos de Uso</a>
        <a href="/privacidade">Política de Privacidade</a>
      </div>
    </div>
  );
}
