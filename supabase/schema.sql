-- ============================================================
-- CANDLE — SCHEMA DO BANCO DE DADOS
-- Cole este arquivo inteiro no SQL Editor do Supabase e clique em "Run".
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------- USUÁRIOS ----------
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  email text unique not null,
  faixa_etaria text,
  instituicao text,
  area_interesse text,
  experiencia text,
  objetivo text,
  tempo_disponivel text,
  horario_lembrete text, -- formato 'HH:MM', ex: '16:00'
  consentimento_lgpd boolean not null default false,
  criado_em timestamptz default now()
);

-- ---------- BANCO DE PERGUNTAS ----------
create table if not exists questions (
  id uuid primary key default gen_random_uuid(),
  area text not null,       -- 'macro' | 'corp' | 'produtos' | 'atualidades'
  nivel text not null,      -- 'conceito' | 'aplicacao' | 'raciocinio' | 'caso'
  enunciado text not null,
  opcao_a text not null,
  opcao_b text not null,
  opcao_c text not null,
  opcao_d text not null,
  correta char(1) not null, -- 'a' | 'b' | 'c' | 'd'
  explicacao text,          -- usado na tela de correção ao final da fase
  ativa boolean default true
);

-- ---------- TENTATIVAS DE QUIZ ----------
create table if not exists quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  tipo text not null default 'diagnostico', -- 'diagnostico' | 'treino_diario'
  iniciado_em timestamptz default now(),
  finalizado_em timestamptz
);

create table if not exists quiz_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid references quiz_attempts(id) on delete cascade,
  question_id uuid references questions(id),
  resposta_dada char(1),
  correta boolean,
  respondido_em timestamptz default now()
);

-- ---------- STREAK ----------
create table if not exists streaks (
  user_id uuid primary key references users(id) on delete cascade,
  dias_seguidos integer default 0,
  ultimo_treino_em date
);

-- ---------- LOG DE E-MAILS (evita duplicidade) ----------
create table if not exists email_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  tipo text not null default 'lembrete_diario',
  enviado_em timestamptz default now()
);

-- Índice pra consulta rápida "quem já recebeu e-mail hoje"
create index if not exists idx_email_log_user_data
  on email_log (user_id, enviado_em);

-- ============================================================
-- SEGURANÇA (Row Level Security) — protege os dados por padrão
-- ============================================================
alter table users enable row level security;
alter table quiz_attempts enable row level security;
alter table quiz_answers enable row level security;
alter table streaks enable row level security;

-- As rotas de API do backend usam a service_role key, que ignora RLS.
-- Isso é proposital: só o SEU servidor (não o navegador do usuário) acessa
-- os dados diretamente. O navegador sempre passa pela sua API.
