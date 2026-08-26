# Candle — Instruções para o Claude Code

Este projeto já vem com todo o código pronto. Você não precisa escrever nada —
só seguir os passos abaixo, na ordem. Cole este arquivo inteiro numa conversa
com o Claude Code e peça: **"siga esse README passo a passo"**.

## O que você vai precisar criar antes (contas gratuitas, sem cartão)

1. **Supabase** — banco de dados. Crie em https://supabase.com
2. **Resend** — envio de e-mail. Crie em https://resend.com
3. **Vercel** — hospedagem do site. Crie em https://vercel.com
4. **GitHub** — pra guardar o código (o Vercel puxa direto de lá). Crie em https://github.com

## Passo a passo

### 1. Instalar as dependências
```
npm install
```

### 2. Configurar o banco de dados
No painel do Supabase, vá em **SQL Editor** e rode estes 3 arquivos **nesta ordem exata** (copie o conteúdo
inteiro do arquivo, cole no editor, clique em **Run**, espere terminar, e só então vá pro próximo):
1. `supabase/schema.sql` — cria todas as tabelas.
2. `supabase/seed_diagnostico.sql` — popula as 80 perguntas do quiz de diagnóstico.
3. `supabase/seed_treino.sql` — popula as 1.600 perguntas do treino diário (arquivo grande, pode demorar
   alguns segundos pra rodar — é normal, é só uma vez).

Alternativa (se um dia rodar este projeto localmente num computador com Node instalado): configure o
`.env.local` (passo 3 abaixo) e rode `npm run seed`, que faz a mesma coisa direto pela API do Supabase,
lendo de `supabase/data/*.json`.

### 3. Configurar as variáveis de ambiente
1. Copie o arquivo `.env.example` e renomeie a cópia para `.env.local`.
2. No Supabase: **Project Settings → API** — copie a "Project URL" e a "anon public key" e a "service_role key" pros campos correspondentes.
3. No Resend: **API Keys** — crie uma chave e cole em `RESEND_API_KEY`.
4. Em `CRON_SECRET`, invente uma senha aleatória qualquer (ex: peça pro Claude Code gerar uma).

### 4. Rodar localmente pra testar
```
npm run dev
```
Abra `http://localhost:3000` no navegador. O fluxo completo (cadastro → quiz → resultado) deve funcionar, salvando de verdade no Supabase.

### 5. Publicar no ar
1. Suba o projeto pro GitHub (peça ajuda ao Claude Code com `git init`, `git add`, `git commit`, `git push`).
2. No Vercel, clique em **Add New Project**, conecte esse repositório do GitHub.
3. Nas configurações do projeto no Vercel, adicione as mesmas variáveis de ambiente do seu `.env.local` (menos o `CRON_SECRET` sem precisar mudar).
4. Clique em **Deploy**.

### 6. Ativar o lembrete diário por e-mail
O arquivo `vercel.json` já está configurado pra chamar a rota de lembrete a cada hora automaticamente, assim que o projeto estiver publicado no Vercel — não precisa fazer mais nada.

**Atenção:** o Vercel no plano gratuito (Hobby) tem limitações na frequência de cron jobs. Se o lembrete não disparar automaticamente, uma alternativa gratuita é usar o site https://cron-job.org pra chamar `https://seusite.vercel.app/api/cron/send-reminders` a cada hora, enviando o header `Authorization: Bearer SEU_CRON_SECRET`.

### 7. Configurar o domínio de envio de e-mail
No arquivo `app/api/cron/send-reminders/route.js`, troque `lembrete@seudominio.com` pelo seu domínio real, verificado no painel do Resend (**Domains**). Enquanto isso, dá pra testar com o domínio de testes que o Resend fornece automaticamente.

---

## Estrutura do projeto

```
app/
  page.js                          → tela única (onboarding + quiz + resultado)
  layout.js                        → estrutura raiz do site
  globals.css                      → todo o visual (cores, animações)
  api/
    users/route.js                 → salva o cadastro do onboarding
    quiz/questions/route.js        → sorteia as 10 perguntas ponderadas
    quiz/submit/route.js           → recebe as respostas e calcula o resultado
    cron/send-reminders/route.js   → dispara os e-mails diários
lib/
  supabaseClient.js                → conexão com o banco
  labels.js                        → textos/traduções compartilhados
scripts/
  seed-questions.mjs               → popula a tabela questions (rodar uma vez, npm run seed)
supabase/
  schema.sql                       → estrutura do banco (rodar uma vez)
  seed_diagnostico.sql             → as 80 perguntas do diagnóstico (rodar uma vez)
  seed_treino.sql                  → as 1.600 perguntas do treino diário, com explicação (rodar uma vez)
  data/question_bank.json          → mesmas 80 perguntas, em JSON (usado por scripts/seed-questions.mjs)
  data/full_bank.json              → mesmas 1.600 perguntas, em JSON (usado por scripts/seed-questions.mjs)
```

## O que ainda falta pro produto completo (próximos passos, não urgente agora)

- Tela de treino diário (hoje só existe o diagnóstico inicial) — a tabela `questions` já tem as
  1.600 perguntas prontas (nivel conceito/aplicacao/raciocinio/caso), só falta a tela consumir isso
- Login para o usuário voltar e ver seu progresso salvo
- Assinatura/pagamento (Asaas), streak, amigos, notícias — ver o documento de arquitetura do produto, seção 13
