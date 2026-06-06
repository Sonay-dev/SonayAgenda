import { type EmailOtpType, type SupabaseClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code"); // PKCE flow (resetPasswordForEmail via @supabase/ssr)
  const next =
    searchParams.get("next") ??
    (type === "recovery" ? "/redefinir-senha" : "/profissional");

  if (code) {
    // PKCE: o Supabase passou pelo proprio servidor e enviou um 'code'
    // em vez de token_hash. exchangeCodeForSession precisa do code verifier
    // que o browser guardou em cookie quando resetPasswordForEmail foi chamado.
    const response = NextResponse.redirect(new URL(next, origin));
    const supabase = makeClient(request, response);
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Se nao for recovery, garante o perfil do profissional (cadastro).
      const sessionType = data?.session?.user?.aud;
      const isRecovery = next === "/redefinir-senha" || sessionType === "recovery";
      if (!isRecovery) {
        await garantirProfissional(supabase);
      }
      return response;
    }
  } else if (token_hash && type) {
    // OTP: link com token_hash direto na URL (formato alternativo do Supabase)
    const response = NextResponse.redirect(new URL(next, origin));
    const supabase = makeClient(request, response);
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      if (type !== "recovery") {
        await garantirProfissional(supabase);
      }
      return response;
    }
  }

  // Token/code ausente, invalido ou expirado.
  return NextResponse.redirect(new URL("/?erro=confirma", origin));
}

function makeClient(request: NextRequest, response: NextResponse) {
  return createServerClient(
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
