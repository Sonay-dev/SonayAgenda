"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Splash from "./_components/Splash";
import {
  Marca,
  CampoSenha,
  BotaoPrimario,
  telaEscura,
  cartaoVidro,
  AuroraPlataforma,
} from "./_components/ui";
import { supabase } from "@/lib/supabase";
import { rotaAposLogin } from "@/lib/auth";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [entrando, setEntrando] = useState(false);
  const [lembrar, setLembrar] = useState(true);

  // Mensagem quando o link de confirmacao/recuperacao falha (/?erro=confirma).
  const erroUrl =
    searchParams.get("erro") === "confirma"
      ? "O link expirou ou já foi usado. Tente entrar ou peça um novo."
      : null;
  const erroMostrado = erro ?? erroUrl;

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setEntrando(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: senha,
    });
    if (error) {
      setEntrando(false);
      setErro(
        error.message === "Invalid login credentials"
          ? "E-mail ou senha incorretos."
          : error.message === "Email not confirmed"
            ? "Confirme seu e-mail antes de entrar. Veja o link que enviamos."
            : error.message,
      );
      return;
    }
    // Registra preferência de sessão
    localStorage.setItem("sonay-lembrar", String(lembrar));
    if (!lembrar) {
      // sessionStorage é apagado quando o browser fecha — garante logout ao reabrir
      sessionStorage.setItem("sonay-sessao", "ativa");
    }
    router.replace(rotaAposLogin(data.user?.email));
  }

  return (
    <Splash>
      <main className={telaEscura}>
        <AuroraPlataforma />
        <Link
          href="/admin/entrar"
          className="absolute right-4 top-4 z-10 flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[12.5px] font-medium text-[#9aa3c7] backdrop-blur-sm transition hover:border-white/25 hover:text-white"
        >
          <span aria-hidden>🛡️</span> Administrador
        </Link>
        <form onSubmit={entrar} className={cartaoVidro}>
          <Marca />
          <h1 className="mt-6 text-center font-display text-[21px] font-bold text-white">
            Entrar no seu negócio
          </h1>
          <p className="mt-1.5 text-center text-[13.5px] text-[#9aa3c7]">
            Acesse a agenda do seu negócio.
          </p>

          {erroMostrado && (
            <div className="mt-4 rounded-xl border border-red-400/40 bg-red-500/15 px-3.5 py-2.5 text-sm text-[#ffb4b4]">
              {erroMostrado}
            </div>
          )}

          <label className="mb-1.5 mt-5 block text-[12.5px] font-medium text-[#9aa3c7]">
            E-mail
          </label>
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="voce@exemplo.com"
            className="w-full rounded-[13px] border border-white/10 bg-white/[0.04] px-3.5 py-3 text-sm text-[#f4f6ff] outline-none transition placeholder:text-[#5c6486] focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/40"
          />

          <label className="mb-1.5 mt-4 block text-[12.5px] font-medium text-[#9aa3c7]">
            Senha
          </label>
          <CampoSenha
            value={senha}
            onChange={setSenha}
            autoComplete="current-password"
            placeholder="Sua senha"
          />

          <div className="mt-3 flex items-center justify-between">
            <label className="flex cursor-pointer items-center gap-2 select-none">
              <input
                type="checkbox"
                checked={lembrar}
                onChange={(e) => setLembrar(e.target.checked)}
                className="h-4 w-4 accent-[#7c3aed]"
              />
              <span className="text-[12.5px] text-[#9aa3c7]">Continuar conectado</span>
            </label>
            <Link
              href="/esqueci-senha"
              className="text-[12.5px] text-[#a78bfa] hover:text-white"
            >
              Esqueci minha senha
            </Link>
          </div>

          <BotaoPrimario
            type="submit"
            disabled={entrando}
            className="mt-5"
          >
            {entrando ? "Entrando..." : "Entrar no seu negócio"}
          </BotaoPrimario>

          <div className="mt-5 border-t border-white/10 pt-5 text-center text-[13.5px] text-[#9aa3c7]">
            Ainda não tem conta?{" "}
            <Link
              href="/cadastro"
              className="font-semibold text-white underline decoration-[#7c3aed] decoration-2 underline-offset-2"
            >
              Cadastrar seu negócio
            </Link>
          </div>

          <div className="mt-5 flex flex-wrap justify-center gap-1.5">
            {["💈 Barbearia", "🏋️ Personal", "💇 Salão", "🤲 Fisio", "✨ Estética"].map(
              (n) => (
                <span
                  key={n}
                  className="rounded-full border border-white/10 px-2.5 py-1 text-[10.5px] text-[#9aa3c7]"
                >
                  {n}
                </span>
              ),
            )}
          </div>
        </form>

        <p className="relative z-10 mx-auto mt-5 max-w-[400px] px-2 text-center text-[11.5px] leading-relaxed text-[#5c6486]">
          Esta área é para profissionais. Clientes devem usar o link enviado
          pelo seu prestador de serviço.
        </p>
      </main>
    </Splash>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<main className={telaEscura} />}>
      <LoginForm />
    </Suspense>
  );
}
