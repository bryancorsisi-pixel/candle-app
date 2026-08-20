-- ============================================================
-- CANDLE — SCHEMA DO BANCO DE DADOS (versão completa, produto pago)
-- Cole este arquivo inteiro no SQL Editor do Supabase e clique em "Run".
-- Depois rode supabase/seed_questions.sql (uma única vez).
-- ============================================================

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- USUÁRIOS
-- Diferença em relação ao doc de arquitetura: aqui `id` NÃO usa
-- gen_random_uuid() — ele É o id do Supabase Auth (auth.uid()).
-- Isso é o padrão do Supabase pra ligar uma tabela de perfil a
-- auth.users, e é o que permite políticas de RLS simples como
-- "id = auth.uid()" em vez de precisar de uma coluna extra de
-- ligação. A linha só é criada depois que a pessoa confirma o
-- código (OTP) enviado por e-mail, então id já existe em auth.users
-- nesse momento.
-- ------------------------------------------------------------
create table if not exists users (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  email text unique not null,
  faixa_etaria text,        -- '<18' | '18-22' | '22-25' | '>25'
  instituicao text,
  area_interesse text,      -- 'macro' | 'corp' | 'produtos' | 'indefinido'
  experiencia text,         -- 'zero' | 'basico' | 'pratico'
  objetivo text,            -- 'estagio' | 'reforco' | 'processo'
  tempo_disponivel text,    -- '15' | '30' | '45' | '60' | '60+'
  horario_lembrete time not null default '16:00',
  fuso_horario text not null default 'America/Sao_Paulo',
  consentimento_lgpd boolean not null default false,
  id_publico text unique,             -- ex: 'CNDL-7X29'
  buscavel_por_nome boolean not null default true,
  responsavel_email text,             -- e-mail do responsável legal, só preenchido se faixa_etaria = '<18' (seção 4.5)
  maior_idade_confirmado boolean not null default false, -- checkbox extra exigido antes de pagar (seção 4.5, opção 1)
  criado_em timestamptz default now()
);

-- ------------------------------------------------------------
-- BANCO DE PERGUNTAS (1.600 linhas, seção 2.2 — nunca embutir no frontend)
-- ------------------------------------------------------------
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
  ativa boolean not null default true
);

create index if not exists idx_questions_area_nivel_ativa
  on questions (area, nivel, ativa);

-- ------------------------------------------------------------
-- TENTATIVAS DE QUIZ (diagnóstico ou treino diário por fase)
-- ------------------------------------------------------------
create table if not exists quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  tipo text not null default 'diagnostico', -- 'diagnostico' | 'treino_diario'
  area text,   -- preenchido em treino_diario
  nivel text,  -- preenchido em treino_diario
  fase int,    -- preenchido em treino_diario (0-indexed)
  iniciado_em timestamptz default now(),
  finalizado_em timestamptz
);

create index if not exists idx_quiz_attempts_user on quiz_attempts (user_id);

create table if not exists quiz_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references quiz_attempts(id) on delete cascade,
  question_id uuid references questions(id),
  resposta_dada char(1),
  correta boolean,
  respondido_em timestamptz default now()
);

create index if not exists idx_quiz_answers_attempt on quiz_answers (attempt_id);

-- ------------------------------------------------------------
-- STREAK (seção 8)
-- ------------------------------------------------------------
create table if not exists streaks (
  user_id uuid primary key references users(id) on delete cascade,
  dias_seguidos integer not null default 0,
  ultimo_treino_em date
);

-- ------------------------------------------------------------
-- LOG DE E-MAILS (evita duplicidade — lembrete diário e sequência de renovação)
-- ------------------------------------------------------------
create table if not exists email_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  tipo text not null, -- 'lembrete_diario' | 'boas_vindas' | 'renovacao_d3' | 'renovacao_d2' | 'renovacao_d1' | 'renovacao_vencido'
  enviado_em timestamptz default now()
);

create index if not exists idx_email_log_user_tipo_data
  on email_log (user_id, tipo, enviado_em);

-- ------------------------------------------------------------
-- ASSINATURA (espelha o estado do Asaas — seção 5)
-- ------------------------------------------------------------
create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references users(id) on delete cascade,
  asaas_customer_id text not null,
  asaas_subscription_id text unique,
  status text not null default 'incomplete', -- 'trialing' | 'active' | 'past_due' | 'canceled' | 'incomplete'
  plano text not null default 'mensal',
  periodo_atual_fim timestamptz,
  cancelamento_agendado boolean not null default false,
  criado_em timestamptz default now(),
  atualizado_em timestamptz default now()
);

-- ------------------------------------------------------------
-- AMIGOS / RANKING (seção 7)
-- ------------------------------------------------------------
create table if not exists friendships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,   -- quem enviou o pedido
  friend_id uuid not null references users(id) on delete cascade, -- quem recebeu o pedido
  status text not null default 'pending', -- 'pending' | 'accepted' | 'blocked'
  criado_em timestamptz default now(),
  respondido_em timestamptz,
  constraint friendships_no_self check (user_id <> friend_id),
  unique (user_id, friend_id)
);

create index if not exists idx_friendships_user on friendships (user_id);
create index if not exists idx_friendships_friend on friendships (friend_id);

-- ============================================================
-- SEGURANÇA (Row Level Security) — seção 2.1, o risco mais sério do doc
-- ============================================================
-- Decisão de arquitetura: TODA escrita e toda leitura que cruza usuários
-- (busca de amigos, ranking, correção de quiz, criação de assinatura) passa
-- pelas rotas /app/api/* deste projeto, que usam a service_role key — essa
-- chave ignora RLS por definição, e SÓ existe no servidor (nunca no navegador).
-- O navegador do usuário só fala diretamente com o Supabase pra: (a) Auth
-- (login/logout) e (b) o canal Realtime de presença (contagem online).
--
-- Por isso, as políticas de RLS abaixo são propositalmente restritivas:
-- cada usuário autenticado só consegue LER a própria linha em cada tabela
-- (nunca escrever direto, nunca ler dado de outro usuário) através da chave
-- anônima. Isso fecha exatamente o buraco que o documento descreve: mesmo
-- que alguém pegue a anon key pelo DevTools (ela é pública por natureza) e
-- tente, na mão, marcar a própria assinatura como 'active' ou ler a resposta
-- certa de uma pergunta antes de responder, a política de RLS bloqueia.
-- A tabela `questions` não tem NENHUMA política — fica 100% inacessível via
-- REST direto (anon/authenticated), porque a coluna `correta` não pode
-- vazar antes da correção; só a service_role (rota /api/quiz/*) lê e nunca
-- devolve `correta` ao cliente antes de ele responder.

alter table users enable row level security;
alter table questions enable row level security;
alter table quiz_attempts enable row level security;
alter table quiz_answers enable row level security;
alter table streaks enable row level security;
alter table email_log enable row level security;
alter table subscriptions enable row level security;
alter table friendships enable row level security;

-- users: cada um só lê a própria linha. Nenhuma política de insert/update/
-- delete pro papel authenticated — isso é proposital: nome, e-mail, horário
-- de lembrete etc. só mudam pela rota /api/profile (service_role), que
-- valida os dados antes de gravar.
create policy "users_select_own" on users
  for select using (id = auth.uid());

-- subscriptions: cada um só lê a própria assinatura, e nunca escreve nela
-- diretamente — é exatamente o exemplo citado na seção 2.1 do doc (ninguém
-- pode marcar a própria assinatura como 'active' sem passar pelo webhook
-- do Asaas, que só a rota de servidor consegue gravar).
create policy "subscriptions_select_own" on subscriptions
  for select using (user_id = auth.uid());

-- streaks: leitura da própria sequência.
create policy "streaks_select_own" on streaks
  for select using (user_id = auth.uid());

-- quiz_attempts: leitura das próprias tentativas.
create policy "quiz_attempts_select_own" on quiz_attempts
  for select using (user_id = auth.uid());

-- quiz_answers: leitura das próprias respostas (via join com quiz_attempts,
-- já que a linha não guarda user_id diretamente).
create policy "quiz_answers_select_own" on quiz_answers
  for select using (
    exists (
      select 1 from quiz_attempts qa
      where qa.id = quiz_answers.attempt_id and qa.user_id = auth.uid()
    )
  );

-- email_log: leitura do próprio histórico de envios.
create policy "email_log_select_own" on email_log
  for select using (user_id = auth.uid());

-- friendships: cada um só enxerga uma amizade onde é o remetente OU o
-- destinatário — nunca a lista de amizades de outra pessoa. Sem política de
-- escrita: pedir amizade, aceitar e recusar passam pela rota /api/friends/*,
-- que também aplica a regra de `buscavel_por_nome` na busca.
create policy "friendships_select_own" on friendships
  for select using (auth.uid() = user_id or auth.uid() = friend_id);

-- questions: nenhuma política = nenhum acesso via anon/authenticated.
-- Só a service_role (rotas /api/quiz/*) lê essa tabela, e essas rotas nunca
-- devolvem a coluna `correta` antes do usuário responder.
