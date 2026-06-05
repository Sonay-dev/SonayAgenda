"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Splash from "./_components/Splash";
import { Marca, CampoSenha, BotaoPrimario, telaEscura } from "./_components/ui";
import { supabase } from "@/lib/supabase";
import { rotaAposLogin } from "@/lib/auth";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [entrando, setEntrando] = useState(false);

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
    router.replace(rotaAposLogin(data.user?.email));
  }

  return (
    <Splash>
      <main className={telaEscura}>
        <form
          onSubmit={entrar}
          className="card-fade w-full max-w-[400px] rounded-[18px] bg-white p-7 shadow-xl"
        >
          <Marca />
          <h1 className="mt-6 text-center font-display text-[22px] font-semibold text-[#1a1a1a]">
            Entrar no seu negócio
          </h1>
          <p className="mt-1 text-center text-sm text-[#777]">
            Acesse a agenda do seu negócio.
          </p>

          {erroMostrado && (
            <div className="mt-4 rounded-lg border border-red-300 bg-red-50 px-3.5 py-2.5 text-sm text-red-800">
              {erroMostrado}
            </div>
          )}

          <label className="mb-1.5 mt-5 block text-[13px] font-medium text-[#666]">
            E-mail
          </label>
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="voce@exemplo.com"
            className="w-full rounded-[9px] border border-[#e6e0d4] bg-[#fafaf7] px-3.5 py-2.5 text-sm outline-none focus:border-[#15131f]"
          />

          <label className="mb-1.5 mt-4 block text-[13px] font-medium text-[#666]">
            Senha
          </label>
          <CampoSenha
            value={senha}
            onChange={setSenha}
            autoComplete="current-password"
            placeholder="Sua senha"
          />

          <div className="mt-2 text-right">
            <Link
              href="/esqueci-senha"
              className="text-[13px] text-[#15131f] underline opacity-70 hover:opacity-100"
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

          <div className="mt-5 border-t border-[#eee] pt-5 text-center text-sm text-[#777]">
            Ainda não tem conta?{" "}
            <Link
              href="/cadastro"
              className="font-semibold text-[#15131f] underline"
            >
              Cadastrar seu negócio
            </Link>
          </div>
        </form>

        <p className="mx-auto mt-4 max-w-[400px] px-2 text-center text-[12px] leading-relaxed text-white/50">
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
