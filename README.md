# Candle — projeto Next.js completo

Este projeto implementa o produto completo descrito em `candle-arquitetura-backend.md`:
onboarding com verificação de e-mail, diagnóstico gratuito, banco de 1.600 perguntas,
treino diário por fases com streak, lembrete diário por e-mail (fuso horário
correto), assinatura mensal via Pix (Asaas), sistema de amigos/ranking, contagem de
usuários online em tempo real, exclusão de conta (LGPD), e Termos de Uso / Política
de Privacidade.

Os passos abaixo seguem exatamente a ordem da seção 12 ("Próximos passos práticos")
do documento de arquitetura. Os passos 1–3 só você consegue fazer (criar contas);
os passos 4 em diante já estão implementados no código — você só precisa configurar
e rodar.

## Passo 1–2 (você): Asaas

1. Crie a conta em [asaas.com](https://asaas.com), passe pela verificação de identidade
   (CPF/CNPJ + dados bancários) e cadastre a chave Pix pra onde o dinheiro deve cair.
2. No painel, copie a **API key de sandbox** primeiro (pra testar sem dinheiro real).
   Produção só depois de validar tudo (ver passo 13 abaixo).

## Passo 3 (você): Supabase e Resend

1. Crie a conta em [supabase.com](https://supabase.com) e um projeto novo.
2. Crie a conta em [resend.com](https://resend.com).

## Passo 4: banco de dados + seed das 1.600 perguntas

1. No painel do Supabase, vá em **SQL Editor**.
2. Cole e rode `supabase/schema.sql` (cria as tabelas e já ativa o RLS em todas).
3. Depois, cole e rode `supabase/seed_questions.sql` (as 1.600 perguntas — arquivo
   grande, pode levar alguns segundos pra rodar).

## Passo 5: variáveis de ambiente e RLS

1. Copie `.env.example` para `.env.local` e preencha:
   - Supabase: **Project Settings → API** (`NEXT_PUBLIC_SUPABASE_URL`,
     `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`).
   - Resend: **API Keys**.
   - Asaas: a API key de sandbox (`ASAAS_API_KEY`), `ASAAS_BASE_URL` já vem certo
     pra sandbox, e invente um `ASAAS_WEBHOOK_TOKEN` (qualquer senha aleatória —
     você vai cadastrar esse mesmo valor no painel do Asaas no passo 9).
   - `CRON_SECRET`: outra senha aleatória qualquer.
2. No painel do Supabase, em **Authentication → Providers → Email**, confirme que
   o login por **OTP (código de 6 dígitos)** está habilitado — é assim que a
   verificação de e-mail funciona no onboarding, sem senha.
3. `npm install` e `npm run dev` — teste o fluxo local: `/` → `/onboarding` →
   código por e-mail → diagnóstico → `/assinar`.

**Antes de considerar o backend pronto, teste o RLS de propósito** (seção 2.1 do
doc): logado como o Usuário A, pegue o token JWT dele (DevTools → Application →
Cookies) e tente, via `curl` com a **anon key**, ler a linha de outro usuário em
`subscriptions` ou `users`. O esperado é **zero linhas retornadas**. Tente também
ler a tabela `questions` direto pela REST API com a anon key — o esperado é erro
de permissão (a tabela não tem nenhuma política de RLS, então fica 100% inacessível
fora da service_role).

## Passo 6–7: treino diário, streak e lembrete por e-mail

Já implementados:
- `app/api/quiz/phase` e `app/api/quiz/phase/submit` — fases de 10 perguntas por
  área/nível, com correção no servidor e atualização de streak.
- `app/api/cron/send-reminders` — lembrete diário, com a hora local calculada pelo
  fuso horário salvo em cada usuário (nunca `now()` cru do servidor).

## Passo 8: presença online + amigos

Já implementados:
- `lib/usePresenceCount.js` — Supabase Realtime Presence, usado na landing e no
  dashboard.
- `app/api/friends/*` — busca (nome/ID público/e-mail exato), pedido, aceite/recusa
  e ranking por taxa de acerto.

## Passo 9: assinatura via Pix (Asaas)

1. No painel do Asaas, vá em **Integrações → Webhooks**, crie um webhook apontando
   pra `https://SEUDOMINIO.com/api/asaas/webhook` (localmente, use algo como
   [ngrok](https://ngrok.com) pra testar webhooks reais), selecione os eventos
   `PAYMENT_CONFIRMED`, `PAYMENT_RECEIVED`, `PAYMENT_OVERDUE`, `PAYMENT_DELETED`,
   `PAYMENT_REFUNDED`, e cadastre o mesmo valor de `ASAAS_WEBHOOK_TOKEN` do seu
   `.env.local` no campo de token de autenticação do webhook.
2. Teste o fluxo completo no **sandbox** do Asaas primeiro: `/assinar` → gerar Pix
   → o próprio painel sandbox do Asaas permite simular a confirmação do pagamento
   sem dinheiro real → o webhook chega e libera o acesso automaticamente.
3. Cancelamento, reembolso dos 7 dias e a checagem de menor de idade já estão
   implementados (`/perfil` e `/assinar`).

## Passo 10: logout e exclusão de conta

Já implementados em `/perfil` (`app/api/account/delete` cancela/estorna a
assinatura se estiver dentro da janela de 7 dias, apaga os dados do usuário e a
conta no Supabase Auth).

## Passo 11: Termos de Uso e Política de Privacidade

Conteúdo em `/termos` e `/privacidade`. **Antes de lançar**, preencha a razão
social/CNPJ na seção 7 dos Termos e peça revisão jurídica — o texto aqui é um
ponto de partida estruturado, não substitui um advogado.

## Passo 12: nota fiscal

Antes de cobrar de verdade: confirme com um contador o enquadramento fiscal (MEI
ou outro) e ative a emissão automática de Nota Fiscal de Serviço (NFS-e) no painel
do Asaas.

## Passo 13: publicar e testar ponta a ponta

1. Suba o projeto pro GitHub.
2. No Vercel, **Add New Project**, conecte o repositório, adicione todas as
   variáveis do `.env.local` (com a URL de produção em `NEXT_PUBLIC_SITE_URL`) e
   clique em **Deploy**.
3. `vercel.json` já configura os crons de lembrete diário e de renovação pra rodar
   a cada hora. No plano gratuito (Hobby), a Vercel pode limitar a frequência —
   se não disparar sozinho, use [cron-job.org](https://cron-job.org) pra chamar
   `https://seudominio.com/api/cron/send-reminders` e
   `https://seudominio.com/api/cron/send-renewals` a cada hora, com o header
   `Authorization: Bearer SEU_CRON_SECRET`.
4. Cadastre o webhook de produção no Asaas (mesma URL, agora com o domínio real) e
   troque `ASAAS_API_KEY`/`ASAAS_BASE_URL` pros valores de produção só depois de
   validar tudo em sandbox com gente de verdade (colegas de faculdade, por exemplo).

---

## Estrutura do projeto

```
app/
  page.js                      → árvore de decisão de entrada (landing/onboarding/paywall/dashboard)
  LandingClient.js              → landing page (visitante sem sessão)
  onboarding/page.js            → triagem completa + verificação de e-mail (OTP)
  diagnostico/page.js           → quiz de diagnóstico gratuito + resultado
  assinar/page.js               → paywall + checkout Pix (com estados de loading/erro)
  dashboard/                    → Treinar (fases por área/nível) / Progresso / Amigos
  perfil/                       → buscável por nome, logout, cancelar/reembolsar, excluir conta
  termos/, privacidade/         → páginas legais
  api/                          → todas as rotas de backend (ver lib/ abaixo)
lib/
  supabaseClient.js             → cliente do navegador (Auth + Presence)
  supabaseServer.js             → cliente admin (service_role) e cliente de sessão (cookies)
  asaas.js                      → wrapper da API do Asaas
  email.js                      → templates de e-mail (Resend)
  access.js                     → regra de acesso liberado / janela de reembolso
  usePresenceCount.js           → hook do Supabase Realtime Presence
supabase/
  schema.sql                    → schema completo + RLS (rodar uma vez)
  seed_questions.sql            → 1.600 perguntas extraídas do protótipo (rodar uma vez)
```

## O que ainda depende de você (fora de código)

- Contas Asaas/Supabase/Resend e as chaves reais (passos 1–3).
- Revisão jurídica dos Termos de Uso e Política de Privacidade.
- Confirmação com contador sobre nota fiscal (MEI ou outro enquadramento).
- Checar no INPI se "Candle" já está registrado antes de investir mais em marca
  (seção 9 do doc de arquitetura).
- Testar o fluxo completo em sandbox com usuários beta reais antes de trocar pra
  chave de produção do Asaas.
