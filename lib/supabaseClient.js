import { createBrowserClient } from '@supabase/ssr';

// Cliente usado no navegador (componentes "use client").
// Só carrega a URL e a chave anônima — a chave anônima é pública por
// natureza (fica embutida no bundle do site) e é exatamente por isso que
// o RLS (supabase/schema.sql) precisa estar ativo em todas as tabelas.
export function getSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
