import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Renova a sessao do Supabase a cada requisicao (padrao @supabase/ssr).
 * Sem isso o token expira e o login "cai" no servidor. Nao protege rotas
 * ainda — apenas mantem a sessao viva e os cookies em dia.
 *
 * No Next 16 essa convencao chama-se "proxy" (era "middleware").
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) return response;

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // IMPORTANTE: chamar getUser() renova o token quando necessario.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    /*
     * Roda em tudo, menos arquivos estaticos e de PWA:
     * _next, favicon, sw.js, manifest, e imagens/icones.
     */
    "/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest|.*\\.(?:png|jpg|jpeg|svg|ico|webmanifest)$).*)",
  ],
};
