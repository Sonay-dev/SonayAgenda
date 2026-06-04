import { createBrowserClient } from "@supabase/ssr";

/**
 * Cliente do Supabase para o NAVEGADOR (componentes "use client").
 *
 * Usa @supabase/ssr para guardar a sessao em cookies — assim o servidor
 * (route handlers, middleware e, depois, os paineis) consegue ler o login.
 * A anon key e publica por natureza; quem protege os dados sao as policies
 * de RLS do schema.
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Variaveis do Supabase ausentes. Defina NEXT_PUBLIC_SUPABASE_URL e " +
      "NEXT_PUBLIC_SUPABASE_ANON_KEY no arquivo .env.local (veja .env.example).",
  );
}

export function createClient() {
  return createBrowserClient(supabaseUrl!, supabaseAnonKey!);
}
