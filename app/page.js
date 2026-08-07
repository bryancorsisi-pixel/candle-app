'use client';

import { useState } from 'react';
import { AREA_NAMES, TEMPO_LABELS, HORARIO_LABELS } from '../lib/labels';

const STEPS = [
  { id: 'welcome', type: 'info', eyebrow: 'Bem-vindo(a) ao Candle', title: 'Que bom ter você aqui! 🕯️',
    sub: 'Vamos te conhecer rapidinho pra montar seus treinos sob medida. Isso leva cerca de 2 minutos.',
    buttonLabel: 'Vamos lá →' },
  { id: 'nome', type: 'text', eyebrow: 'Vamos começar', title: 'Qual é o seu nome?',
    sub: 'Assim a gente te chama pelo nome certo nos treinos.', placeholder: 'Seu nome' },
  { id: 'faixa_etaria', type: 'options', eyebrow: 'Cadastro', title: 'Qual sua faixa etária?', sub: '',
    options: [
      { v: '<18', label: 'Menos de 18' }, { v: '18-22', label: 'Entre 18 e 22' },
      { v: '22-25', label: 'Entre 22 e 25' }, { v: '>25', label: 'Mais de 25' },
    ] },
  { id: 'instituicao', type: 'text', eyebrow: 'Cadastro', title: 'Curso, instituição e período',
    sub: 'Ex: Economia, USP, 5º semestre.', placeholder: 'Ex: Economia — USP — 5º semestre' },
  { id: 'area_interesse', type: 'options', eyebrow: 'O mais importante',
    title: '{nome}, qual área do mercado financeiro te interessa mais?', sub: '',
    options: [
      { v: 'macro', label: 'Macroeconomia', desc: 'Juros, inflação, câmbio' },
      { v: 'corp', label: 'Finanças Corporativas / IB', desc: 'Valuation, M&A' },
      { v: 'produtos', label: 'Produtos Financeiros', desc: 'Renda fixa, variável, derivativos' },
      { v: 'indefinido', label: 'Ainda não sei', desc: 'Quero explorar um pouco de cada' },
    ] },
  { id: 'experiencia', type: 'options', eyebrow: 'Cadastro', title: 'Qual seu nível de experiência hoje?', sub: '',
    options: [
      { v: 'zero', label: 'Nunca estudei o assunto' }, { v: 'basico', label: 'Já estudei por conta própria' },
      { v: 'pratico', label: 'Já tenho experiência prática' },
    ] },
  { id: 'objetivo', type: 'options', eyebrow: 'Cadastro', title: 'Qual seu objetivo com o Candle?', sub: '',
    options: [
      { v: 'estagio', label: 'Conseguir meu primeiro estágio' }, { v: 'reforco', label: 'Reforçar o que já estudo' },
      { v: 'processo', label: 'Me preparar pra um processo seletivo' },
    ] },
  { id: 'tempo_disponivel', type: 'options', eyebrow: 'Rotina', title: 'Quanto tempo por dia você consegue dedicar?',
    sub: '{nome}, vamos montar sessões que cabem exatamente nesse tempo.',
    options: [
      { v: '15', label: '0 – 15 minutos' }, { v: '30', label: '15 – 30 minutos' },
      { v: '45', label: '30 – 45 minutos' }, { v: '60', label: '45 – 60 minutos' }, { v: '60+', label: 'Mais de 1 hora' },
    ] },
  { id: 'horario_lembrete', type: 'options', eyebrow: 'Último dado', title: 'Qual o melhor horário do dia pra você treinar?',
    sub: 'Vamos te mandar o lembrete diário exatamente nesse horário.',
    options: [
      { v: '08:00', label: 'De manhã (8h)' }, { v: '12:00', label: 'No almoço (12h)' },
      { v: '16:00', label: 'À tarde (16h)' }, { v: '20:00', label: 'À noite (20h)' },
    ] },
  { id: 'email', type: 'text', eyebrow: 'Cadastro', title: '{nome}, qual é o seu e-mail?',
    sub: 'É pra onde vai chegar seu lembrete diário, {horario_curto}.', placeholder: 'voce@email.com' },
  { id: 'email-confirm', type: 'info', eyebrow: 'Combinado', title: 'Vamos te lembrar todo dia',
    sub: '{nome}, a partir de amanhã, todo dia {horario_curto}, mandamos um e-mail pra você. São só {tempo_curto}.',
    buttonLabel: 'Vamos começar →' },
  { id: 'consent', type: 'consent', eyebrow: 'Última etapa', title: 'Antes de começar',
    sub: 'Precisamos do seu consentimento para tratar seus dados, conforme a LGPD.',
    consentText: 'Autorizo o tratamento dos meus dados pessoais para criação de conta e personalização dos treinos.' },
];

function personalize(text, formData) {
  if (!text) return text;
  const fn = (formData.nome || '').trim().split(' ')[0] || 'você';
  return text
    .replace(/\{nome\}/g, fn)
    .replace(/\{tempo_curto\}/g, TEMPO_LABELS[formData.tempo_disponivel] || 'alguns minutos por dia')
    .replace(/\{horario_curto\}/g, HORARIO_LABELS[formData.horario_lembrete] || 'no horário escolhido');
}

export default function CandleApp() {
  const [phase, setPhase] = useState('onboarding'); // onboarding | quiz | results | error
  const [stepIndex, setStepIndex] = useState(0);
  const [formData, setFormData] = useState({});
  const [userId, setUserId] = useState(null);
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState([]);
  const [selectedOpt, setSelectedOpt] = useState(null);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const step = STEPS[stepIndex];

  async function handleFinishOnboarding() {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar cadastro.');

      setUserId(data.user.id);

      const qRes = await fetch(`/api/quiz/questions?area=${formData.area_interesse || 'indefinido'}`);
      const qData = await qRes.json();
      if (!qRes.ok) throw new Error(qData.error || 'Erro ao buscar perguntas.');

      setQuizQuestions(qData.questions);
      setPhase('quiz');
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleAnswer(letra) {
    if (selectedOpt) return; // já respondeu essa
    setSelectedOpt(letra);
    const q = quizQuestions[quizIndex];
    setQuizAnswers((prev) => [...prev, { question_id: q.id, resposta_dada: letra, area: q.area }]);
  }

  async function handleNextQuestion() {
    if (quizIndex < quizQuestions.length - 1) {
      setQuizIndex((i) => i + 1);
      setSelectedOpt(null);
    } else {
      setLoading(true);
      try {
        const res = await fetch('/api/quiz/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: userId,
            tipo: 'diagnostico',
            respostas: quizAnswers.map((a) => ({ question_id: a.question_id, resposta_dada: a.resposta_dada })),
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro ao enviar respostas.');
        setResults(data);
        setPhase('results');
      } catch (err) {
        setErrorMsg(err.message);
      } finally {
        setLoading(false);
      }
    }
  }

  // ---------- RENDER: ONBOARDING ----------
  if (phase === 'onboarding') {
    const progress = Math.round((stepIndex / (STEPS.length - 1)) * 100);

    return (
      <div className="app-shell">
        <div className="topbar">
          <div className="topbar-row">
            <div className="brand">candle<span style={{ color: 'var(--gain)' }}>.</span></div>
            <div className="quote"><span>{progress}%</span></div>
          </div>
          <div className="step-label">ETAPA {stepIndex + 1} / {STEPS.length}</div>
        </div>

        <div className="stage">
          <div className="card">
            <div className="eyebrow">{step.eyebrow}</div>
            <h1>{personalize(step.title, formData)}</h1>
            {step.sub && <p className="sub">{personalize(step.sub, formData)}</p>}

            {step.type === 'text' && (
              <input
                type="text"
                placeholder={step.placeholder}
                value={formData[step.id] || ''}
                onChange={(e) => setFormData({ ...formData, [step.id]: e.target.value })}
                autoFocus
              />
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

            {errorMsg && <p style={{ color: 'var(--loss)', marginTop: 12 }}>{errorMsg}</p>}
          </div>
        </div>

        <div className="footer">
          {stepIndex > 0 && (
            <button className="nav btn-back" onClick={() => setStepIndex((i) => i - 1)}>Voltar</button>
          )}
          <button
            className="nav btn-next"
            disabled={
              loading ||
              (step.type === 'text' && !formData[step.id]?.trim()) ||
              (step.type === 'options' && !formData[step.id]) ||
              (step.type === 'consent' && !formData.consentimento_lgpd)
            }
            onClick={() => {
              const isLast = stepIndex === STEPS.length - 1;
              if (isLast) handleFinishOnboarding();
              else setStepIndex((i) => i + 1);
            }}
          >
            {loading ? 'Um momento…' : step.buttonLabel || (stepIndex === STEPS.length - 1 ? 'Iniciar diagnóstico →' : 'Continuar')}
          </button>
        </div>
      </div>
    );
  }

  // ---------- RENDER: QUIZ ----------
  if (phase === 'quiz') {
    const q = quizQuestions[quizIndex];
    const letras = ['a', 'b', 'c', 'd'];
    const opcoes = [q.opcao_a, q.opcao_b, q.opcao_c, q.opcao_d];

    return (
      <div className="app-shell">
        <div className="topbar">
          <div className="topbar-row">
            <div className="brand">candle<span style={{ color: 'var(--gain)' }}>.</span></div>
          </div>
          <div className="step-label">PERGUNTA {quizIndex + 1} / {quizQuestions.length}</div>
        </div>

        <div className="stage">
          <div className="card">
            <div className="eyebrow">{AREA_NAMES[q.area]} · {q.nivel === 'basica' ? 'conceito' : 'aplicação'}</div>
            <h1 style={{ fontSize: 21 }}>{q.enunciado}</h1>
            <div className="options" style={{ marginTop: 20 }}>
              {opcoes.map((texto, i) => {
                const letra = letras[i];
                const isSelected = selectedOpt === letra;
                const isCorrectOpt = q.correta === letra;
                let style = {};
                if (selectedOpt) {
                  if (isCorrectOpt) style = { borderColor: 'var(--gain)', background: 'rgba(52,211,153,0.1)' };
                  else if (isSelected) style = { borderColor: 'var(--loss)', background: 'rgba(229,72,77,0.08)' };
                }
                return (
                  <button key={letra} className="opt" style={style} onClick={() => handleAnswer(letra)}>
                    <span className="opt-main"><span>{texto}</span></span>
                    <span className="tick" style={{ opacity: selectedOpt ? 1 : 0, color: isCorrectOpt ? 'var(--gain)' : 'var(--loss)' }}>
                      {selectedOpt && (isCorrectOpt ? '✓' : isSelected ? '✕' : '')}
                    </span>
                  </button>
                );
              })}
            </div>
            {selectedOpt && (
              <button className="nav btn-next" style={{ width: '100%', marginTop: 22 }} disabled={loading} onClick={handleNextQuestion}>
                {loading ? 'Calculando…' : quizIndex < quizQuestions.length - 1 ? 'Continuar →' : 'Ver resultado →'}
              </button>
            )}
            {errorMsg && <p style={{ color: 'var(--loss)', marginTop: 12 }}>{errorMsg}</p>}
          </div>
        </div>
      </div>
    );
  }

  // ---------- RENDER: RESULTADO ----------
  if (phase === 'results' && results) {
    const areasComDados = Object.entries(results.resultados).filter(([, r]) => r.total > 0);
    const comPct = areasComDados.map(([area, r]) => ({ area, pct: Math.round((r.acertos / r.total) * 100) }));
    const strongest = comPct.reduce((max, cur) => (cur.pct > max.pct ? cur : max), comPct[0]);
    const weakest = comPct.reduce((min, cur) => (cur.pct < min.pct ? cur : min), comPct[0]);
    const overallPct = Math.round((results.totalAcertos / results.totalPerguntas) * 100);
    const primeiroNome = (formData.nome || '').trim().split(' ')[0] || 'você';

    return (
      <div className="app-shell">
        <div className="stage">
          <div className="card done-wrap">
            <div className="ticker">{overallPct}%</div>
            <h1>Seu diagnóstico, {primeiroNome}</h1>
            <p className="sub">Parabéns por terminar sua primeira triagem! O Candle vai te ajudar a fechar essas lacunas todo dia.</p>

            <div className="summary" style={{ marginBottom: 18 }}>
              {Object.entries(results.resultados).map(([area, r]) => (
                <div className="summary-row" key={area}>
                  <span className="k">{AREA_NAMES[area]}</span>
                  <span className="v">{r.total > 0 ? Math.round((r.acertos / r.total) * 100) : 0}% ({r.acertos}/{r.total})</span>
                </div>
              ))}
            </div>

            <div className="summary" style={{ borderColor: 'var(--gain)', background: 'rgba(52,211,153,0.06)', textAlign: 'left' }}>
              <p style={{ fontSize: 14, lineHeight: 1.6 }}>
                Parabéns, {primeiroNome}! Dá pra ver que você manja muito de{' '}
                <strong style={{ color: 'var(--gain)' }}>{AREA_NAMES[strongest.area]}</strong>. Bora fortalecer seu
                conhecimento em <strong style={{ color: 'var(--gold)' }}>{AREA_NAMES[weakest.area]}</strong> — seus
                treinos diários vão priorizar essa área a partir de agora.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <div className="app-shell"><p style={{ color: 'white', padding: 20 }}>Carregando…</p></div>;
}
