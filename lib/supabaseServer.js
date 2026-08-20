import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Cliente admin: usa a service_role key, que ignora RLS. Só existe no
// servidor (rotas /app/api/* e Server Components) — NUNCA deve ser
// exposta no navegador. É essa chave que faz todas as escritas (cadastro,
// correção de quiz, assinatura, amigos) depois de validar os dados.
export function getSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      'Supabase não configurado. Confira se NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY estão no .env.local'
    );
  }

  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// Cliente de servidor "com a identidade da pessoa logada": lê o cookie de
// sessão do Supabase Auth (gravado pelo middleware.js) pra saber quem está
// fazendo a requisição, sem precisar confiar em nenhum dado enviado pelo
// corpo da requisição. É isso que usamos pra responder "quem é o usuário
// autenticado agora?" nas rotas de API e nos Server Components (árvore de
// decisão de entrada, seção 4.1 do doc de arquitetura).
export function getSupabaseServerClient() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // chamado de dentro de um Server Component (não uma Route
            // Handler) — o middleware já cuida de renovar a sessão nesse
            // caso, então é seguro ignorar aqui.
          }
        },
      },
    }
  );
}

// Devolve { user, profile } a partir da sessão atual, ou ambos null se
// ninguém estiver logado. `profile` é a linha em `users` (pode não existir
// ainda se a pessoa verificou o e-mail mas não terminou a triagem).
export async function getCurrentUserAndProfile() {
  const supabase = getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { supabase, user: null, profile: null };

  const admin = getSupabaseAdminClient();
  const { data: profile } = await admin.from('users').select('*').eq('id', user.id).maybeSingle();

  return { supabase, user, profile: profile || null };
}
