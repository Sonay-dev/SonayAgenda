import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Destino dos links de e-mail do Supabase (confirmacao de cadastro e
 * recuperacao de senha). Valida o token_hash, cria a sessao em cookie e
 * redireciona para `next` (/profissional no cadastro, /redefinir-senha na
 * recuperacao). Veja o trecho de template de e-mail nas instrucoes.
 *
 * Aqui tambem criamos a linha em `profissionais` no primeiro acesso do
 * cadastro: o Supabase free tier nao deixa criar trigger no schema auth,
 * entao garantimos o perfil neste ponto — ja autenticado, a policy de RLS
 * (auth.uid() = id) permite o insert. So roda na confirmacao de cadastro,
 * nunca na recuperacao de senha.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next =
    searchParams.get("next") ??
    (type === "recovery" ? "/redefinir-senha" : "/profissional");

  if (token_hash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      if (type !== "recovery") {
        await garantirProfissional(supabase);
      }
      return NextResponse.redirect(new URL(next, origin));
    }
  }

  // Token ausente, invalido ou expirado.
  return NextResponse.redirect(new URL("/?erro=confirma", origin));
}

/**
 * Cria a linha em `profissionais` a partir dos metadados do cadastro
 * (nome/nicho), se ainda nao existir. Idempotente: ignora se ja existe.
 */
async function garantirProfissional(
  supabase: Awaited<ReturnType<typeof createClient>>,
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const meta = user.user_metadata ?? {};
  // Sem nicho = nao e um cadastro de negocio (ex.: admin). Nao cria perfil.
  if (!meta.nicho) return;

  await supabase.from("profissionais").upsert(
    {
      id: user.id,
      nome:
        typeof meta.nome === "string" && meta.nome.trim()
          ? meta.nome.trim()
          : "Meu negócio",
      nicho: meta.nicho,
      email: user.email,
    },
    { onConflict: "id", ignoreDuplicates: true },
  );
}
