'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ALL_AREAS, ALL_LEVELS, AREA_NAMES, LEVEL_NAMES, firstName } from '../../lib/labels';
import { usePresenceCount } from '../../lib/usePresenceCount';

const PHASES_PER_LEVEL = 10;

function levelStats(progress, area, nivel) {
  let acertos = 0, total = 0, done = 0;
  for (let f = 0; f < PHASES_PER_LEVEL; f++) {
    const p = progress[`${area}_${nivel}_${f}`];
    if (p) { acertos += p.acertos; total += p.total; done++; }
  }
  return { acertos, total, done, pct: total > 0 ? Math.round((acertos / total) * 100) : null };
}

function areaStats(progress, area) {
  let acertos = 0, total = 0;
  ALL_LEVELS.forEach((nivel) => {
    const s = levelStats(progress, area, nivel);
    acertos += s.acertos; total += s.total;
  });
  return { acertos, total, pct: total > 0 ? Math.round((acertos / total) * 100) : null };
}

function isLevelUnlocked(progress, area, nivel) {
  const idx = ALL_LEVELS.indexOf(nivel);
  if (idx === 0) return true;
  const prev = ALL_LEVELS[idx - 1];
  return levelStats(progress, area, prev).done >= PHASES_PER_LEVEL;
}

function isPhaseUnlocked(progress, area, nivel, fase) {
  if (!isLevelUnlocked(progress, area, nivel)) return false;
  if (fase === 0) return true;
  return !!progress[`${area}_${nivel}_${fase - 1}`];
}

export default function DashboardClient({ profile }) {
  const router = useRouter();
  const online = usePresenceCount();

  const [tab, setTab] = useState('treino');
  const [progress, setProgress] = useState({});
  const [streak, setStreak] = useState(0);
  const [nav, setNav] = useState({ area: null, nivel: null });
  const [quiz, setQuiz] = useState(null); // { area, nivel, fase, questions, index, answers, selected }
  const [quizResult, setQuizResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [friends, setFriends] = useState(null);
  const [friendSearch, setFriendSearch] = useState('');
  const [friendResults, setFriendResults] = useState([]);

  const loadProgress = useCallback(async () => {
    const res = await fetch('/api/progress');
    const data = await res.json();
    if (res.ok) setProgress(data.progress);
  }, []);

  const loadFriends = useCallback(async () => {
    const res = await fetch('/api/friends/list');
    const data = await res.json();
    if (res.ok) setFriends(data);
  }, []);

  useEffect(() => {
    loadProgress();
  }, [loadProgress]);

  useEffect(() => {
    if (tab === 'amigos' && !friends) loadFriends();
  }, [tab, friends, loadFriends]);

  async function startPhase(area, nivel, fase) {
    setLoading(true);
    setErrorMsg('');
    setQuizResult(null);
    try {
      const res = await fetch(`/api/quiz/phase?area=${area}&nivel=${nivel}&fase=${fase}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao buscar perguntas.');
      setQuiz({ area, nivel, fase, questions: data.questions, index: 0, answers: [], selected: null });
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  }

  function answerQuiz(letra) {
    if (quiz.selected) return;
    const q = quiz.questions[quiz.index];
    setQuiz({
      ...quiz,
      selected: letra,
      answers: [...quiz.answers, { question_id: q.id, resposta_dada: letra }],
    });
  }

  async function nextQuizQuestion() {
    if (quiz.index < quiz.questions.length - 1) {
      setQuiz({ ...quiz, index: quiz.index + 1, selected: null });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/quiz/phase/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ area: quiz.area, nivel: quiz.nivel, fase: quiz.fase, respostas: quiz.answers }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao enviar respostas.');
      setQuizResult(data);
      setStreak(data.dias_seguidos);
      await loadProgress();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function searchFriends() {
    if (friendSearch.trim().length < 2) return;
    const res = await fetch(`/api/friends/search?q=${encodeURIComponent(friendSearch.trim())}`);
    const data = await res.json();
    if (res.ok) setFriendResults(data.results);
  }

  async function sendFriendRequest(id_publico) {
    await fetch('/api/friends/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_publico }),
    });
    searchFriends();
    loadFriends();
  }

  async function respondFriend(friendship_id, action) {
    await fetch('/api/friends/respond', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ friendship_id, action }),
    });
    loadFriends();
  }

  // ---------- QUIZ VIEW ----------
  if (quiz && !quizResult) {
    const q = quiz.questions[quiz.index];
    const letras = ['a', 'b', 'c', 'd'];
    const opcoes = [q.opcao_a, q.opcao_b, q.opcao_c, q.opcao_d];
    return (
      <div className="app-shell">
        <div className="topbar">
          <div className="topbar-row">
            <div className="brand">candle<span style={{ color: 'var(--gain)' }}>.</span></div>
          </div>
          <div className="step-label">{AREA_NAMES[quiz.area]} · {LEVEL_NAMES[quiz.nivel]} · {quiz.index + 1}/{quiz.questions.length}</div>
        </div>
        <div className="stage">
          <div className="card">
            <h1 style={{ fontSize: 21 }}>{q.enunciado}</h1>
            <div className="options" style={{ marginTop: 20 }}>
              {opcoes.map((texto, i) => (
                <button key={letras[i]} className={`opt ${quiz.selected === letras[i] ? 'selected' : ''}`} onClick={() => answerQuiz(letras[i])}>
                  <span className="opt-main"><span>{texto}</span></span>
                </button>
              ))}
            </div>
            {quiz.selected && (
              <button className="nav btn-next" style={{ width: '100%', marginTop: 22 }} disabled={loading} onClick={nextQuizQuestion}>
                {loading ? <span className="spinner" /> : quiz.index < quiz.questions.length - 1 ? 'Continuar →' : 'Concluir fase →'}
              </button>
            )}
            {errorMsg && <div className="error-banner">{errorMsg}</div>}
          </div>
        </div>
      </div>
    );
  }

  if (quiz && quizResult) {
    return (
      <div className="app-shell">
        <div className="stage">
          <div className="card done-wrap">
            <div className="ticker">{Math.round((quizResult.acertos / quizResult.total) * 100)}%</div>
            <h1>Fase concluída!</h1>
            <p className="sub">{quizResult.acertos} de {quizResult.total} certas · sequência de {quizResult.dias_seguidos} {quizResult.dias_seguidos === 1 ? 'dia' : 'dias'} 🔥</p>
            <button className="nav btn-next" style={{ width: '100%' }} onClick={() => { setQuiz(null); setQuizResult(null); }}>
              Voltar ao treino →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---------- DASHBOARD SHELL ----------
  return (
    <div className="app-shell">
      <div className="page dash-page">
        <div className="dash-header">
          <div>
            <div className="dash-greeting">Bora treinar, {firstName(profile.nome)}?</div>
            <div className="online-banner">
              <span className="online-dot" />
              {online === null ? '' : `${online} ${online === 1 ? 'pessoa treinando' : 'pessoas treinando'} agora`}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div className="streak-pill">🔥 {streak || '—'}</div>
            <button className="profile-btn" onClick={() => router.push('/perfil')} aria-label="Perfil">👤</button>
          </div>
        </div>

        {tab === 'treino' && (
          <TreinoTab
            nav={nav}
            setNav={setNav}
            progress={progress}
            startPhase={startPhase}
            loading={loading}
            errorMsg={errorMsg}
          />
        )}

        {tab === 'progresso' && <ProgressoTab progress={progress} />}

        {tab === 'amigos' && (
          <AmigosTab
            friends={friends}
            friendSearch={friendSearch}
            setFriendSearch={setFriendSearch}
            friendResults={friendResults}
            searchFriends={searchFriends}
            sendFriendRequest={sendFriendRequest}
            respondFriend={respondFriend}
          />
        )}
      </div>

      <div className="tabbar">
        <div className="tabbar-inner">
          <button className={`tab-btn ${tab === 'treino' ? 'active' : ''}`} onClick={() => { setTab('treino'); setNav({ area: null, nivel: null }); }}>📈 Treinar</button>
          <button className={`tab-btn ${tab === 'progresso' ? 'active' : ''}`} onClick={() => setTab('progresso')}>📊 Progresso</button>
          <button className={`tab-btn ${tab === 'amigos' ? 'active' : ''}`} onClick={() => setTab('amigos')}>👥 Amigos</button>
        </div>
      </div>
    </div>
  );
}

function TreinoTab({ nav, setNav, progress, startPhase, loading, errorMsg }) {
  if (nav.area && nav.nivel) {
    const unlocked = isLevelUnlocked(progress, nav.area, nav.nivel);
    return (
      <div>
        <button className="back-link" onClick={() => setNav({ area: nav.area, nivel: null })}>← {LEVEL_NAMES[nav.nivel]}</button>
        <div className="section-title">{AREA_NAMES[nav.area]} · {LEVEL_NAMES[nav.nivel]}</div>
        {!unlocked ? (
          <p className="sub">Conclua o nível anterior pra desbloquear este.</p>
        ) : (
          <div className="phase-grid">
            {Array.from({ length: PHASES_PER_LEVEL }).map((_, fase) => {
              const p = progress[`${nav.area}_${nav.nivel}_${fase}`];
              const unlockedPhase = isPhaseUnlocked(progress, nav.area, nav.nivel, fase);
              return (
                <div
                  key={fase}
                  className={`phase-cell ${p ? 'done' : ''} ${!unlockedPhase ? 'locked' : ''}`}
                  onClick={() => unlockedPhase && !loading && startPhase(nav.area, nav.nivel, fase)}
                >
                  {fase + 1}
                </div>
              );
            })}
          </div>
        )}
        {loading && <p className="sub" style={{ marginTop: 14 }}><span className="spinner" /> Carregando fase…</p>}
        {errorMsg && <div className="error-banner">{errorMsg}</div>}
      </div>
    );
  }

  if (nav.area) {
    return (
      <div>
        <button className="back-link" onClick={() => setNav({ area: null, nivel: null })}>← {AREA_NAMES[nav.area]}</button>
        {ALL_LEVELS.map((nivel) => {
          const s = levelStats(progress, nav.area, nivel);
          const unlocked = isLevelUnlocked(progress, nav.area, nivel);
          return (
            <div key={nivel} className="level-row" style={{ cursor: unlocked ? 'pointer' : 'default' }} onClick={() => unlocked && setNav({ area: nav.area, nivel })}>
              <div>
                <div className={`level-name ${!unlocked ? 'level-locked' : ''}`}>{LEVEL_NAMES[nivel]}</div>
                <div className="profile-row-desc">{s.done}/{PHASES_PER_LEVEL} fases · {s.pct !== null ? `${s.pct}%` : '—'}</div>
              </div>
              <span style={{ color: 'var(--text-muted)' }}>{unlocked ? '→' : '🔒'}</span>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div>
      {ALL_AREAS.map((area) => {
        const s = areaStats(progress, area);
        return (
          <div key={area} className="area-card" onClick={() => setNav({ area, nivel: null })}>
            <div className="area-card-top">
              <span className="area-card-title">{AREA_NAMES[area]}</span>
              <span className="area-card-pct">{s.pct !== null ? `${s.pct}%` : 'começar'}</span>
            </div>
            <div className="progress-track"><div className="progress-fill" style={{ width: `${s.pct || 0}%` }} /></div>
          </div>
        );
      })}
    </div>
  );
}

function ProgressoTab({ progress }) {
  return (
    <div>
      <div className="section-title">Seu progresso por área</div>
      {ALL_AREAS.map((area) => {
        const s = areaStats(progress, area);
        return (
          <div key={area} className="area-card" style={{ cursor: 'default' }}>
            <div className="area-card-top">
              <span className="area-card-title">{AREA_NAMES[area]}</span>
              <span className="area-card-pct">{s.pct !== null ? `${s.pct}% (${s.acertos}/${s.total})` : 'sem dados ainda'}</span>
            </div>
            <div className="progress-track"><div className="progress-fill" style={{ width: `${s.pct || 0}%` }} /></div>
            {ALL_LEVELS.map((nivel) => {
              const ls = levelStats(progress, area, nivel);
              return (
                <div key={nivel} className="level-row" style={{ padding: '8px 0' }}>
                  <span className="profile-row-desc">{LEVEL_NAMES[nivel]}</span>
                  <span className="profile-row-desc">{ls.done}/{PHASES_PER_LEVEL} fases</span>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

function AmigosTab({ friends, friendSearch, setFriendSearch, friendResults, searchFriends, sendFriendRequest, respondFriend }) {
  return (
    <div>
      <div className="friend-search-row">
        <input
          type="text"
          placeholder="Buscar por nome, ID (CNDL-XXXX) ou e-mail"
          value={friendSearch}
          onChange={(e) => setFriendSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && searchFriends()}
        />
        <button onClick={searchFriends}>Buscar</button>
      </div>

      {friendResults.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          {friendResults.map((r) => (
            <div key={r.id_publico} className="friend-item">
              <div>
                <div className="friend-name">{r.nome}</div>
                <div className="friend-id">{r.id_publico}</div>
              </div>
              {!r.status && <button className="friend-action" onClick={() => sendFriendRequest(r.id_publico)}>Adicionar</button>}
              {r.status === 'pending' && <span className="profile-row-desc">Pendente</span>}
              {r.status === 'accepted' && <span className="profile-row-desc">Já são amigos</span>}
            </div>
          ))}
        </div>
      )}

      {friends?.pedidosRecebidos?.length > 0 && (
        <>
          <div className="section-title">Pedidos recebidos</div>
          {friends.pedidosRecebidos.map((p) => (
            <div key={p.friendship_id} className="friend-item">
              <div>
                <div className="friend-name">{p.nome}</div>
                <div className="friend-id">{p.id_publico}</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="friend-action accept" onClick={() => respondFriend(p.friendship_id, 'accept')}>Aceitar</button>
                <button className="friend-action" onClick={() => respondFriend(p.friendship_id, 'decline')}>Recusar</button>
              </div>
            </div>
          ))}
        </>
      )}

      <div className="section-title">Ranking</div>
      {!friends?.ranking?.length && <p className="sub">Adicione amigos pra comparar seu progresso.</p>}
      {friends?.ranking?.map((f, i) => (
        <div key={f.id || i} className={`ranking-row ${f.souEu ? 'me' : ''}`}>
          <span className="ranking-pos">{i + 1}</span>
          <div style={{ flex: 1 }}>
            <div className="friend-name">{f.nome}</div>
          </div>
          <span className="friend-pct">{f.pct !== null ? `${f.pct}%` : '—'}</span>
        </div>
      ))}
    </div>
  );
}
