'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AssinarPage() {
  const router = useRouter();
  const [stage, setStage] = useState('checking'); // checking | offer | need-age-confirm | generating | qr | error
  const [errorMsg, setErrorMsg] = useState('');
  const [qr, setQr] = useState(null);
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const pollRef = useRef(null);

  useEffect(() => {
    checkStatus();
    return () => clearInterval(pollRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function checkStatus() {
    try {
      const res = await fetch('/api/subscription/status');
      if (res.status === 401) {
        router.push('/onboarding');
        return;
      }
      const data = await res.json();
      if (data.hasAccess) {
        router.push('/dashboard');
        return;
      }
      setStage('offer');
    } catch {
      setStage('offer');
    }
  }

  async function gerarPix(withAgeConfirm) {
    setStage('generating');
    setErrorMsg('');
    try {
      const res = await fetch('/api/subscription/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maior_idade_confirmado: withAgeConfirm || ageConfirmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === 'menor_idade') {
          setStage('need-age-confirm');
          return;
        }
        throw new Error(data.message || data.error || 'Erro ao gerar cobrança Pix.');
      }
      setQr(data.qrCode);
      setStage('qr');
      pollRef.current = setInterval(async () => {
        const r = await fetch('/api/subscription/status');
        const d = await r.json();
        if (d.hasAccess) {
          clearInterval(pollRef.current);
          router.push('/dashboard');
        }
      }, 3000);
    } catch (err) {
      setErrorMsg(err.message);
      setStage('error');
    }
  }

  if (stage === 'checking') {
    return <div className="app-shell"><div className="page" style={{ textAlign: 'center', paddingTop: 80 }}><span className="spinner" /></div></div>;
  }

  if (stage === 'need-age-confirm') {
    return (
      <div className="app-shell">
        <div className="paywall-wrap active">
          <div className="paywall-eyebrow">Antes de continuar</div>
          <div className="paywall-title">Confirmação necessária</div>
          <p className="paywall-sub">
            Você indicou ter menos de 18 anos na triagem. Pra assinar, confirme que é maior de idade ou que tem
            autorização de um responsável legal pra contratar essa assinatura.
          </p>
          <label className="consent-box consent-inline">
            <input type="checkbox" checked={ageConfirmed} onChange={(e) => setAgeConfirmed(e.target.checked)} />
            <p>Confirmo que sou maior de idade, ou que tenho autorização de um responsável legal para contratar esta assinatura.</p>
          </label>
          <button className="landing-cta" style={{ width: '100%' }} disabled={!ageConfirmed} onClick={() => gerarPix(true)}>
            Continuar →
          </button>
        </div>
      </div>
    );
  }

  if (stage === 'generating') {
    return (
      <div className="app-shell">
        <div className="paywall-wrap active" style={{ textAlign: 'center' }}>
          <span className="spinner" style={{ width: 28, height: 28 }} />
          <p className="sub" style={{ marginTop: 16 }}>Gerando sua cobrança Pix…</p>
        </div>
      </div>
    );
  }

  if (stage === 'error') {
    return (
      <div className="app-shell">
        <div className="paywall-wrap active">
          <div className="error-banner">
            {errorMsg}
            <button onClick={() => gerarPix()}>Tentar de novo</button>
          </div>
        </div>
      </div>
    );
  }

  if (stage === 'qr') {
    return (
      <div className="app-shell">
        <div className="paywall-wrap active">
          <div className="paywall-eyebrow">Pagamento via Pix</div>
          <div className="paywall-title" style={{ fontSize: 21 }}>Escaneie o QR code pra concluir</div>
          <p className="paywall-sub">R$ 11,90 · assinatura mensal Candle</p>

          <div className="pix-qr-card">
            <div className="pix-qr-mock">
              {qr?.encodedImage && <img src={`data:image/png;base64,${qr.encodedImage}`} alt="QR code Pix" />}
            </div>
            <div className="pix-qr-status">
              <span className="pix-qr-dot" /> Aguardando confirmação do pagamento…
            </div>
            {qr?.payload && (
              <div
                className="pix-payload"
                onClick={() => navigator.clipboard?.writeText(qr.payload)}
                title="Clique para copiar"
              >
                {qr.payload}
              </div>
            )}
          </div>

          <p className="paywall-note" style={{ marginTop: 4 }}>
            Assim que o pagamento é confirmado pelo seu banco, o Asaas avisa o site automaticamente (webhook) e seu
            acesso libera na hora — sem precisar recarregar a página.
          </p>
        </div>
      </div>
    );
  }

  // stage === 'offer'
  return (
    <div className="app-shell">
      <div className="paywall-wrap active">
        <div className="paywall-eyebrow">Tudo pronto</div>
        <div className="paywall-title">Seu plano de treino diário está montado</div>
        <p className="paywall-sub">Assine pra liberar as 1.600 perguntas, o lembrete no seu horário e seu progresso salvo todo dia.</p>

        <div className="paywall-benefits">
          <div className="paywall-benefit">
            <div className="paywall-benefit-icon">📅</div>
            <div className="paywall-benefit-text"><strong>Treino diário no seu horário</strong><span>Lembrete automático pra não perder a sequência</span></div>
          </div>
          <div className="paywall-benefit">
            <div className="paywall-benefit-icon">🔥</div>
            <div className="paywall-benefit-text"><strong>Sequência e progresso salvos</strong><span>Acompanhe sua evolução por área e nível</span></div>
          </div>
          <div className="paywall-benefit">
            <div className="paywall-benefit-icon">✓</div>
            <div className="paywall-benefit-text"><strong>1.600 perguntas revisadas</strong><span>4 áreas × 4 níveis, do conceito à entrevista</span></div>
          </div>
        </div>

        <div className="paywall-price-card">
          <div className="paywall-price" style={{ fontSize: 34 }}><sup style={{ fontSize: 16 }}>R$</sup>11<span style={{ fontSize: 20 }}>,90</span><span style={{ fontSize: 16 }}>/mês</span></div>
          <div className="paywall-price-period">cancele quando quiser, sem multa</div>
          <div className="paywall-methods">
            <span className="paywall-method-tag">Pagamento via Pix</span>
          </div>
        </div>

        <button className="landing-cta" style={{ width: '100%' }} onClick={() => gerarPix()}>
          Gerar QR code Pix →
        </button>
        <div className="paywall-note">
          Ao clicar, o Asaas gera uma cobrança real e um QR code Pix vinculado à sua conta. O pagamento cai direto na
          sua chave cadastrada — nenhum valor passa pelos servidores do Candle.
        </div>
      </div>
    </div>
  );
}
