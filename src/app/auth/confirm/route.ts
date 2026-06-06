import { type EmailOtpType, type SupabaseClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next =
    searchParams.get("next") ??
    (type === "recovery" ? "/redefinir-senha" : "/profissional");

  if (token_hash && type) {
    // Cria a resposta de redirect ANTES de chamar verifyOtp para que os
    // cookies de sessao sejam gravados direto nela. Em Route Handlers o
    // NextResponse.redirect() cria uma resposta nova — se os cookies forem
    // setados pelo cookies() do next/headers eles ficam em outra resposta e
    // o navegador nunca os recebe. Este padrao e o correto para handlers.
    const response = NextResponse.redirect(new URL(next, origin));

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options),
            );
          },
        },
      },
    );

    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      if (type !== "recovery") {
        await garantirProfissional(supabase);
      }
      return response; // ja carrega os cookies de sessao
    }
  }

  // Token ausente, invalido ou expirado.
  return NextResponse.redirect(new URL("/?erro=confirma", origin));
}

/**
 * Cria a linha em `profissionais` a partir dos metadados do cadastro
 * (nome/nicho), se ainda nao existir. Idempotente: ignora se ja existe.
 */
async function garantirProfissional(supabase: SupabaseClient) {
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
