import { createClient } from '@supabase/supabase-js';

// Cliente usado só no lado do servidor (rotas /app/api/*).
// Usa a service_role key, que tem permissão total — por isso NUNCA
// deve ser exposta no navegador. Só existe aqui, dentro do backend.
export function getSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      'Supabase não configurado. Confira se NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY estão no .env.local'
    );
  }

  return createClient(url, serviceKey);
}
