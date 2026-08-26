// Script de seed: insere as perguntas do protótipo na tabela `questions` do Supabase.
// Roda uma única vez (ou sempre que quiser recarregar do zero). Uso:
//   node --env-file=.env.local scripts/seed-questions.mjs
//
// Lê os dois bancos de perguntas extraídos do protótipo:
//   supabase/data/question_bank.json  -> 80 perguntas do quiz de diagnóstico (nivel 'basica'/'avancada')
//   supabase/data/full_bank.json      -> 1.600 perguntas do treino diário (nivel 'conceito'/'aplicacao'/'raciocinio'/'caso'), com explicação

import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error('Faltam NEXT_PUBLIC_SUPABASE_URL e/ou SUPABASE_SERVICE_ROLE_KEY no .env.local');
  process.exit(1);
}

const supabase = createClient(url, serviceKey);

async function seedFile(path, label) {
  const rows = JSON.parse(fs.readFileSync(path, 'utf8'));
  const CHUNK = 500;
  let inserted = 0;

  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const { error } = await supabase.from('questions').insert(chunk);
    if (error) {
      console.error(`Erro inserindo ${label} (lote ${i}-${i + chunk.length}):`, error.message);
      process.exit(1);
    }
    inserted += chunk.length;
    console.log(`${label}: ${inserted}/${rows.length} inseridas`);
  }
}

async function main() {
  const { count: existing, error: countErr } = await supabase
    .from('questions')
    .select('*', { count: 'exact', head: true });

  if (countErr) {
    console.error('Não consegui conectar na tabela questions. A tabela já existe? Rodou o schema.sql?', countErr.message);
    process.exit(1);
  }

  if (existing > 0) {
    console.log(`A tabela questions já tem ${existing} linha(s). Abortando pra evitar duplicar.`);
    console.log('Se quiser recarregar do zero, apague as linhas existentes primeiro (SQL Editor: delete from questions;) e rode de novo.');
    process.exit(0);
  }

  await seedFile('supabase/data/question_bank.json', 'diagnóstico');
  await seedFile('supabase/data/full_bank.json', 'treino diário');

  const { count: total } = await supabase
    .from('questions')
    .select('*', { count: 'exact', head: true });

  console.log(`\nPronto! Total de perguntas na tabela questions: ${total}`);
}

main();
