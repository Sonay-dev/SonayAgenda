"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Marca,
  Campo,
  BotaoPrimario,
  telaEscura,
  cartaoVidro,
  AuroraPlataforma,
} from "../_components/ui";
import { supabase } from "@/lib/supabase";

export default function EsqueciSenhaPage() {
  const [email, setEmail] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/confirm?next=/redefinir-senha`,
    });
    setEnviando(false);
    if (error) {
      setErro(error.message);
      return;
    }
    setEnviado(true);
  }

  return (
    <main className={telaEscura}>
      <AuroraPlataforma />
      <div className={cartaoVidro}>
        <Marca />

        {enviado ? (
          <div className="mt-6 text-center">
            <div className="text-[44px]">📩</div>
            <h1 className="mt-2 font-display text-[21px] font-bold text-white">
              Verifique seu e-mail
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-[#9aa3c7]">
              Se existir uma conta com esse e-mail, enviamos um link para você
              criar uma nova senha.
            </p>
            <Link
              href="/"
              className="mt-6 inline-block text-sm font-medium text-[#a78bfa] hover:text-white"
            >
              Voltar para o login
            </Link>
          </div>
        ) : (
          <form onSubmit={enviar}>
            <h1 className="mt-6 text-center font-display text-[21px] font-bold text-white">
              Esqueci minha senha
            </h1>
            <p className="mt-1.5 text-center text-[13.5px] text-[#9aa3c7]">
              Informe seu e-mail para receber o link de recuperação.
            </p>

            {erro && (
              <div className="mt-4 rounded-xl border border-red-400/40 bg-red-500/15 px-3.5 py-2.5 text-sm text-[#ffb4b4]">
                {erro}
              </div>
            )}

            <label className="mb-1.5 mt-5 block text-[12.5px] font-medium text-[#9aa3c7]">
              E-mail
            </label>
            <Campo
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@exemplo.com"
            />

            <BotaoPrimario
              type="submit"
              disabled={!email.includes("@") || enviando}
              className="mt-6"
            >
              {enviando ? "Enviando..." : "Enviar link"}
            </BotaoPrimario>

            <div className="mt-5 text-center text-sm">
              <Link href="/" className="text-[#a78bfa] hover:text-white">
                Voltar para o login
              </Link>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
