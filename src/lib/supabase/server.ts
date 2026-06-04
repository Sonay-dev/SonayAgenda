import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Cliente do Supabase para o SERVIDOR (route handlers e Server Components).
 *
 * Le e grava a sessao nos cookies da requisicao. Usado, por enquanto, no
 * route handler /auth/confirm para validar o link de e-mail. Os paineis
 * (profissional/admin) vao reaproveitar este mesmo cliente depois.
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Variaveis do Supabase ausentes. Defina NEXT_PUBLIC_SUPABASE_URL e " +
      "NEXT_PUBLIC_SUPABASE_ANON_KEY no arquivo .env.local (veja .env.example).",
  );
}

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl!, supabaseAnonKey!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Chamado de um Server Component — o middleware ja renova a sessao,
          // entao da pra ignorar com seguranca.
        }
      },
    },
  });
}
