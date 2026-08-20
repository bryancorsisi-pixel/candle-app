'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '../../lib/supabaseClient';
import { TEMPO_LABELS, HORARIO_LABELS } from '../../lib/labels';

export const dynamic = 'force-dynamic';

const BASE_STEPS = [
  {
    id: 'welcome', type: 'info', eyebrow: 'Bem-vindo(a) ao Candle', title: 'Que bom ter você aqui! 🕯️',
    sub: 'Vamos te conhecer rapidinho pra montar seus treinos sob medida. Isso leva cerca de 2 minutos.',
    buttonLabel: 'Vamos lá →',
  },
  {
    id: 'nome', type: 'text', eyebrow: 'Vamos começar', title: 'Qual é o seu nome?',
    sub: 'Assim a gente te chama pelo nome certo nos treinos.', placeholder: 'Seu nome completo',
    validate: (v) => v.trim().split(/\s+/).filter((p) => p.length >= 2).length >= 2,
    errorMsg: 'Digite seu nome completo (nome e sobrenome)',
  },
  {
    id: 'faixa_etaria', type: 'options', eyebrow: 'Cadastro', title: 'Qual sua faixa etária?', sub: '',
    options: [
      { v: '<18', label: 'Menos de 18' }, { v: '18-22', label: 'Entre 18 e 22' },
      { v: '22-25', label: 'Entre 22 e 25' }, { v: '>25', label: 'Mais de 25' },
    ],
  },
  {
    id: 'instituicao', type: 'text', eyebrow: 'Cadastro', title: 'Curso, instituição e período',
    sub: 'Ex: Economia, USP, 5º semestre.', placeholder: 'Ex: Economia — USP — 5º semestre',
    validate: (v) => v.trim().split(/\s+/).length >= 3,
    errorMsg: 'Preencha curso, instituição e período',
  },
  {
    id: 'area_interesse', type: 'options', eyebrow: 'O mais importante',
    title: '{nome}, qual área do mercado financeiro te interessa mais?', sub: '',
    options: [
      { v: 'macro', label: 'Macroeconomia', desc: 'Juros, inflação, câmbio' },
      { v: 'corp', label: 'Finanças Corporativas / IB', desc: 'Valuation, M&A' },
      { v: 'produtos', label: 'Produtos Financeiros', desc: 'Renda fixa, variável, derivativos' },
      { v: 'indefinido', label: 'Ainda não sei', desc: 'Quero explorar um pouco de cada' },
    ],
  },
  {
    id: 'experiencia', type: 'options', eyebrow: 'Cadastro', title: 'Qual seu nível de experiência hoje?', sub: '',
    options: [
      { v: 'zero', label: 'Nunca estudei o assunto' }, { v: 'basico', label: 'Já estudei por conta própria' },
      { v: 'pratico', label: 'Já tenho experiência prática' },
    ],
  },
  {
    id: 'objetivo', type: 'options', eyebrow: 'Cadastro', title: 'Qual seu objetivo com o Candle?', sub: '',
    options: [
      { v: 'estagio', label: 'Conseguir meu primeiro estágio' }, { v: 'reforco', label: 'Reforçar o que já estudo' },
      { v: 'processo', label: 'Me preparar pra um processo seletivo' },
    ],
  },
  {
    id: 'tempo_disponivel', type: 'options', eyebrow: 'Rotina', title: 'Quanto tempo por dia você consegue dedicar?',
    sub: '{nome}, vamos montar sessões que cabem exatamente nesse tempo.',
    options: [
      { v: '15', label: '0 – 15 minutos' }, { v: '30', label: '15 – 30 minutos' },
      { v: '45', label: '30 – 45 minutos' }, { v: '60', label: '45 – 60 minutos' }, { v: '60+', label: 'Mais de 1 hora' },
    ],
  },
  {
    id: 'horario_lembrete', type: 'options', eyebrow: 'Último dado', title: 'Qual o melhor horário do dia pra você treinar?',
    sub: 'Vamos te mandar o lembrete diário exatamente nesse horário.',
    options: [
      { v: '08:00', label: 'De manhã (8h)' }, { v: '12:00', label: 'No almoço (12h)' },
      { v: '16:00', label: 'À tarde (16h)' }, { v: '20:00', label: 'À noite (20h)' },
    ],
  },
  {
    id: 'email', type: 'text', eyebrow: 'Cadastro', title: '{nome}, qual é o seu e-mail?',
    sub: 'Vamos mandar um código de confirmação pra esse endereço.', placeholder: 'voce@email.com',
    validate: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()),
    errorMsg: 'Digite um e-mail válido',
  },
  {
    id: 'otp', type: 'otp', eyebrow: 'Confirme seu e-mail', title: 'Digite o código que enviamos',
    sub: 'Chegou um código de 6 dígitos em {email}. Ele vale por alguns minutos.',
  },
  {
    id: 'email-confirm', type: 'info', eyebrow: 'Combinado', title: 'Vamos te lembrar todo dia',
    sub: '{nome}, a partir de amanhã, todo dia {horario_curto}, mandamos um e-mail pra você. São só {tempo_curto}.',
    buttonLabel: 'Vamos começar →',
  },
  {
    id: 'consent', type: 'consent', eyebrow: 'Última etapa', title: 'Antes de começar',
    sub: 'Precisamos do seu consentimento para tratar seus dados, conforme a LGPD.',
    consentText: (
      <>Autorizo o tratamento dos meus dados pessoais para criação de conta e personalização dos treinos, conforme a{' '}
        <a href="/privacidade" target="_blank">Política de Privacidade</a>.</>
    ),
  },
];

function personalize(text, formData) {
  if (!text || typeof text !== 'string') return text;
  const fn = (formData.nome || '').trim().split(' ')[0] || 'você';
  return text
    .replace(/\{nome\}/g, fn)
    .replace(/\{email\}/g, formData.email || '')
    .replace(/\{tempo_curto\}/g, TEMPO_LABELS[formData.tempo_disponivel] || 'alguns minutos por dia')
    .replace(/\{horario_curto\}/g, HORARIO_LABELS[formData.horario_lembrete] || 'no horário escolhido');
}

export default function OnboardingPage() {
  const router = useRouter();

  const [alreadyAuthed, setAlreadyAuthed] = useState(null); // null = checando
  const [stepIndex, setStepIndex] = useState(0);
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [otpCode, setOtpCode] = useState('');

  useEffect(() => {
    getSupabaseBrowserClient().auth.getUser().then(({ data }) => {
      if (data.user) {
        setFormData((f) => ({ ...f, email: data.user.email }));
        setAlreadyAuthed(true);
      } else {
        setAlreadyAuthed(false);
      }
    });
  }, []);

  if (alreadyAuthed === null) {
    return <div className="app-shell"><div className="page">Carregando…</div></div>;
  }

  const steps = alreadyAuthed
    ? BASE_STEPS.filter((s) => s.id !== 'email' && s.id !== 'otp')
    : BASE_STEPS;
  const step = steps[stepIndex];
  const progress = Math.round((stepIndex / (steps.length - 1)) * 100);

  async function handleSendOtp() {
    setLoading(true);
    setErrorMsg('');
    const { error } = await getSupabaseBrowserClient().auth.signInWithOtp({
      email: formData.email,
      options: { shouldCreateUser: true },
    });
    setLoading(false);
    if (error) {
      setErrorMsg(error.message);
      return;
    }
    setStepIndex((i) => i + 1);
  }

  async function handleVerifyOtp() {
    setLoading(true);
    setErrorMsg('');
    const { error } = await getSupabaseBrowserClient().auth.verifyOtp({
      email: formData.email,
      token: otpCode,
      type: 'email',
    });
    setLoading(false);
    if (error) {
      setErrorMsg('Código inválido ou expirado. Tente de novo.');
      return;
    }
    setStepIndex((i) => i + 1);
  }

  async function handleFinishOnboarding() {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar cadastro.');
      router.push('/diagnostico');
    } catch (err) {
      setErrorMsg(err.message);
      setLoading(false);
    }
  }

  function goNext() {
    const isLast = stepIndex === steps.length - 1;
    if (step.id === 'email') return handleSendOtp();
    if (step.id === 'otp') return handleVerifyOtp();
    if (isLast) return handleFinishOnboarding();
    setStepIndex((i) => i + 1);
    setErrorMsg('');
  }

  const canAdvance = (() => {
    if (loading) return false;
    if (step.type === 'text') {
      const v = (formData[step.id] || '').trim();
      if (!v) return false;
      return step.validate ? step.validate(v) : true;
    }
    if (step.type === 'options') return !!formData[step.id];
    if (step.type === 'consent') return !!formData.consentimento_lgpd;
    if (step.type === 'otp') return otpCode.trim().length === 6;
    return true;
  })();

  return (
    <div className="app-shell">
      <div className="topbar">
        <div className="topbar-row">
          <div className="brand">candle<span style={{ color: 'var(--gain)' }}>.</span></div>
          <div className="quote"><span>{progress}%</span></div>
        </div>
        <div className="step-label">ETAPA {stepIndex + 1} / {steps.length}</div>
      </div>

      <div className="stage">
        <div className="card">
          <div className="eyebrow">{step.eyebrow}</div>
          <h1>{personalize(step.title, formData)}</h1>
          {step.sub && <p className="sub">{personalize(step.sub, formData)}</p>}

          {step.type === 'text' && (
            <input
              type={step.id === 'email' ? 'email' : 'text'}
              placeholder={step.placeholder}
              value={formData[step.id] || ''}
              onChange={(e) => setFormData({ ...formData, [step.id]: e.target.value })}
              autoFocus
            />
          )}

          {step.type === 'otp' && (
            <input
              className="otp-input"
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="000000"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
              autoFocus
            />
          )}
          {step.type === 'otp' && (
            <button className="otp-resend" type="button" onClick={handleSendOtp} disabled={loading}>
              Não recebeu? Reenviar código
            </button>
          )}

          {step.type === 'options' && (
            <div className="options">
              {step.options.map((o) => (
                <button
                  key={o.v}
                  className={`opt ${formData[step.id] === o.v ? 'selected' : ''}`}
                  onClick={() => setFormData({ ...formData, [step.id]: o.v })}
                >
                  <span className="opt-main">
                    <span>{o.label}</span>
                    {o.desc && <span className="opt-desc">{o.desc}</span>}
                  </span>
                  <span className="tick">✓</span>
                </button>
              ))}
            </div>
          )}

          {step.type === 'consent' && (
            <label className="consent-box">
              <input
                type="checkbox"
                checked={!!formData.consentimento_lgpd}
                onChange={(e) => setFormData({ ...formData, consentimento_lgpd: e.target.checked })}
              />
              <p>{step.consentText}</p>
            </label>
          )}

          {step.errorMsg && formData[step.id] && !canAdvance && step.type === 'text' && (
            <p style={{ color: 'var(--loss)', marginTop: 10, fontSize: 13 }}>{step.errorMsg}</p>
          )}
          {errorMsg && <div className="error-banner">{errorMsg}</div>}
        </div>
      </div>

      <div className="footer">
        {stepIndex > 0 && step.id !== 'otp' && (
          <button className="nav btn-back" onClick={() => setStepIndex((i) => i - 1)}>Voltar</button>
        )}
        <button className="nav btn-next" disabled={!canAdvance} onClick={goNext}>
          {loading ? <span className="spinner" /> : step.buttonLabel || (stepIndex === steps.length - 1 ? 'Iniciar diagnóstico →' : 'Continuar')}
        </button>
      </div>
    </div>
  );
}
