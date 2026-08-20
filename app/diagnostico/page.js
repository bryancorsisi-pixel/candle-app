'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AREA_NAMES, LEVEL_NAMES } from '../../lib/labels';

export default function DiagnosticoPage() {
  const router = useRouter();
  const [phase, setPhase] = useState('loading'); // loading | quiz | results | error
  const [questions, setQuestions] = useState([]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [results, setResults] = useState(null);
  const [loadingNext, setLoadingNext] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/quiz/questions');
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro ao buscar perguntas.');
        if (!data.questions?.length) throw new Error('Nenhuma pergunta disponível ainda.');
        setQuestions(data.questions);
        setPhase('quiz');
      } catch (err) {
        setErrorMsg(err.message);
        setPhase('error');
      }
    }
    load();
  }, []);

  function handleAnswer(letra) {
    if (selected) return;
    setSelected(letra);
    const q = questions[index];
    setAnswers((prev) => [...prev, { question_id: q.id, resposta_dada: letra, area: q.area }]);
  }

  async function handleNext() {
    if (index < questions.length - 1) {
      setIndex((i) => i + 1);
      setSelected(null);
      return;
    }
    setLoadingNext(true);
    try {
      const res = await fetch('/api/quiz/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ respostas: answers.map((a) => ({ question_id: a.question_id, resposta_dada: a.resposta_dada })) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao enviar respostas.');
      setResults(data);
      setPhase('results');
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoadingNext(false);
    }
  }

  if (phase === 'loading') {
    return <div className="app-shell"><div className="page" style={{ textAlign: 'center', paddingTop: 80 }}><span className="spinner" /></div></div>;
  }

  if (phase === 'error') {
    return (
      <div className="app-shell">
        <div className="page">
          <div className="error-banner">
            {errorMsg}
            <button onClick={() => window.location.reload()}>Tentar de novo</button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'quiz') {
    const q = questions[index];
    const letras = ['a', 'b', 'c', 'd'];
    const opcoes = [q.opcao_a, q.opcao_b, q.opcao_c, q.opcao_d];

    return (
      <div className="app-shell">
        <div className="topbar">
          <div className="topbar-row">
            <div className="brand">candle<span style={{ color: 'var(--gain)' }}>.</span></div>
          </div>
          <div className="step-label">PERGUNTA {index + 1} / {questions.length}</div>
        </div>

        <div className="stage">
          <div className="card">
            <div className="eyebrow">{AREA_NAMES[q.area]} · {LEVEL_NAMES[q.nivel]}</div>
            <h1 style={{ fontSize: 21 }}>{q.enunciado}</h1>
            <div className="options" style={{ marginTop: 20 }}>
              {opcoes.map((texto, i) => {
                const letra = letras[i];
                const isSelected = selected === letra;
                return (
                  <button
                    key={letra}
                    className={`opt ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleAnswer(letra)}
                  >
                    <span className="opt-main"><span>{texto}</span></span>
                  </button>
                );
              })}
            </div>
            {selected && (
              <button className="nav btn-next" style={{ width: '100%', marginTop: 22 }} disabled={loadingNext} onClick={handleNext}>
                {loadingNext ? <span className="spinner" /> : index < questions.length - 1 ? 'Continuar →' : 'Ver resultado →'}
              </button>
            )}
            {errorMsg && <div className="error-banner">{errorMsg}</div>}
          </div>
        </div>
      </div>
    );
  }

  // phase === 'results'
  const areasComDados = Object.entries(results.resultados).filter(([, r]) => r.total > 0);
  const comPct = areasComDados.map(([area, r]) => ({ area, pct: Math.round((r.acertos / r.total) * 100) }));
  const strongest = comPct.reduce((max, cur) => (cur.pct > max.pct ? cur : max), comPct[0]);
  const weakest = comPct.reduce((min, cur) => (cur.pct < min.pct ? cur : min), comPct[0]);
  const overallPct = Math.round((results.totalAcertos / results.totalPerguntas) * 100);

  return (
    <div className="app-shell">
      <div className="stage">
        <div className="card done-wrap">
          <div className="ticker">{overallPct}%</div>
          <h1>Seu diagnóstico</h1>
          <p className="sub">Parabéns por terminar sua primeira triagem! O Candle vai te ajudar a fechar essas lacunas todo dia.</p>

          <div className="summary" style={{ marginBottom: 18 }}>
            {Object.entries(results.resultados).map(([area, r]) => (
              <div className="summary-row" key={area}>
                <span className="k">{AREA_NAMES[area]}</span>
                <span className="v">{r.total > 0 ? Math.round((r.acertos / r.total) * 100) : 0}% ({r.acertos}/{r.total})</span>
              </div>
            ))}
          </div>

          {strongest && weakest && (
            <div className="summary" style={{ borderColor: 'var(--gain)', background: 'rgba(52,211,153,0.06)', textAlign: 'left', marginBottom: 24 }}>
              <p style={{ fontSize: 14, lineHeight: 1.6 }}>
                Dá pra ver que você manja muito de{' '}
                <strong style={{ color: 'var(--gain)' }}>{AREA_NAMES[strongest.area]}</strong>. Bora fortalecer seu
                conhecimento em <strong style={{ color: 'var(--gold)' }}>{AREA_NAMES[weakest.area]}</strong> — seus
                treinos diários vão priorizar essa área a partir de agora.
              </p>
            </div>
          )}

          <button className="nav btn-next" style={{ width: '100%' }} onClick={() => router.push('/assinar')}>
            Começar a treinar →
          </button>
        </div>
      </div>
    </div>
  );
}
