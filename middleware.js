import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

// Renova o token de sessão do Supabase Auth a cada requisição e mantém o
// cookie sincronizado. Sem isso, sessões expiram silenciosamente e a
// árvore de decisão de entrada (app/page.js) passaria a tratar gente já
// logada como visitante novo.
export async function middleware(request) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
