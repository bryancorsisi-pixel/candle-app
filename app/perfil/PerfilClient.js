'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '../../lib/supabaseClient';

export default function PerfilClient({ profile }) {
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();

  const [findable, setFindable] = useState(profile.buscavel_por_nome);
  const [subscription, setSubscription] = useState(null);
  const [withinRefund, setWithinRefund] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    fetch('/api/subscription/status')
      .then((r) => r.json())
      .then((d) => {
        setSubscription(d.subscription);
        setWithinRefund(d.withinRefundWindow);
      });
  }, []);

  async function toggleFindable() {
    const next = !findable;
    setFindable(next);
    await fetch('/api/profile/findable', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ buscavel_por_nome: next }),
    });
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/');
  }

  async function handleCancel() {
    setBusy(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/subscription/cancel', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao cancelar.');
      window.location.reload();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleRefund() {
    setBusy(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/subscription/refund', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao solicitar reembolso.');
      window.location.reload();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setBusy(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/account/delete', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao excluir conta.');
      router.push('/');
    } catch (err) {
      setErrorMsg(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="app-shell">
      <div className="page">
        <button className="back-link" onClick={() => router.push('/dashboard')}>← Voltar</button>
        <h1 style={{ marginBottom: 4 }}>{profile.nome}</h1>
        <p className="sub" style={{ marginBottom: 4 }}>{profile.email}</p>
        <p className="friend-id" style={{ marginBottom: 26 }}>{profile.id_publico}</p>

        <div className="profile-row">
          <div>
            <div className="profile-row-label">Buscável por nome ou ID</div>
            <div className="profile-row-desc">Se desligado, só quem já sabe seu e-mail consegue te adicionar.</div>
          </div>
          <div className={`toggle ${findable ? 'on' : ''}`} onClick={toggleFindable}>
            <div className="toggle-knob" />
          </div>
        </div>

        <div className="section-title">Assinatura</div>
        <div className="profile-row">
          <div>
            <div className="profile-row-label">Status</div>
            <div className="profile-row-desc">
              {subscription?.status === 'active' && 'Ativa'}
              {subscription?.status === 'past_due' && 'Pagamento pendente'}
              {subscription?.status === 'canceled' && 'Cancelada'}
              {!subscription && 'Carregando…'}
            </div>
          </div>
        </div>

        {errorMsg && <div className="error-banner">{errorMsg}</div>}

        {subscription?.status === 'active' && (
          <button className="btn-secondary" disabled={busy} onClick={handleCancel}>
            {busy ? <span className="spinner" /> : 'Cancelar assinatura'}
          </button>
        )}
        {withinRefund && (
          <button className="btn-secondary" disabled={busy} onClick={handleRefund}>
            {busy ? <span className="spinner" /> : 'Solicitar reembolso (primeiros 7 dias)'}
          </button>
        )}

        <div className="section-title">Conta</div>
        <button className="btn-secondary" onClick={handleLogout}>Sair</button>
        <button className="btn-secondary btn-danger" disabled={busy} onClick={handleDelete}>
          {busy ? <span className="spinner" /> : confirmDelete ? 'Confirmar exclusão — isso não pode ser desfeito' : 'Excluir minha conta'}
        </button>
        {confirmDelete && (
          <button className="btn-link" style={{ marginTop: 10 }} onClick={() => setConfirmDelete(false)}>Cancelar</button>
        )}

        <p className="profile-row-desc" style={{ marginTop: 24, lineHeight: 1.6 }}>
          Dúvidas ou problemas? Fale com a gente: <a href="mailto:candlequizz@gmail.com">candlequizz@gmail.com</a>
        </p>
      </div>
    </div>
  );
}
