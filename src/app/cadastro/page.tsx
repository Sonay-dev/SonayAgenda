"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Marca,
  Campo,
  CampoSenha,
  ChecklistSenha,
  senhaValida,
  BotaoPrimario,
  telaEscura,
  cartaoVidro,
  AuroraPlataforma,
} from "../_components/ui";
import { NICHOS_LISTA, type Nicho } from "@/lib/nichos";
import { supabase } from "@/lib/supabase";

export default function CadastroPage() {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [nicho, setNicho] = useState<Nicho>(NICHOS_LISTA[0].valor);
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const podeEnviar =
    nome.trim().length > 1 && email.includes("@") && senhaValida(senha);

  async function cadastrar(e: React.FormEvent) {
    e.preventDefault();
    if (!podeEnviar) return;
    setErro(null);
    setEnviando(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password: senha,
      options: {
        data: { nome: nome.trim(), nicho },
        emailRedirectTo: `${window.location.origin}/auth/confirm?next=/profissional`,
      },
    });
    if (error) {
      setEnviando(false);
      setErro(
        error.message.includes("already registered")
          ? "Este e-mail já tem conta. Tente entrar ou recuperar a senha."
          : error.message,
      );
      return;
    }

    // Sem sessao = confirmacao de e-mail ainda ligada no Supabase.
    // Cai na tela de "verifique seu e-mail" (comportamento antigo).
    if (!data.session) {
      router.replace("/cadastro/verifique");
      return;
    }

    // Com sessao (confirmacao desligada): cria o perfil ja autenticado
    // (RLS permite auth.uid() = id) e entra direto no painel.
    await supabase.from("profissionais").upsert(
      {
        id: data.user!.id,
        nome: nome.trim(),
        nicho,
        email: email.trim(),
      },
      { onConflict: "id", ignoreDuplicates: true },
    );
    router.replace("/profissional");
  }

  return (
    <main className={telaEscura}>
      <AuroraPlataforma />
      <form onSubmit={cadastrar} className={cartaoVidro}>
        <Marca />
        <h1 className="mt-6 text-center font-display text-[21px] font-bold text-white">
          Cadastrar seu negócio
        </h1>
        <p className="mt-1.5 text-center text-[13.5px] text-[#9aa3c7]">
          Crie sua conta para gerenciar a agenda.
        </p>

        {erro && (
          <div className="mt-4 rounded-xl border border-red-400/40 bg-red-500/15 px-3.5 py-2.5 text-sm text-[#ffb4b4]">
            {erro}
          </div>
        )}

        <label className="mb-1.5 mt-5 block text-[12.5px] font-medium text-[#9aa3c7]">
          Nome do negócio
        </label>
        <Campo
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Ex.: Studio Léo Barbearia"
        />

        <label className="mb-1.5 mt-4 block text-[12.5px] font-medium text-[#9aa3c7]">
          Nicho
        </label>
        <select
          value={nicho}
          onChange={(e) => setNicho(e.target.value as Nicho)}
          className="w-full rounded-[13px] border border-white/10 bg-white/[0.04] px-3.5 py-3 text-sm text-[#f4f6ff] outline-none transition focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/40"
        >
          {NICHOS_LISTA.map((n) => (
            <option key={n.valor} value={n.valor} className="text-[#1a1a1a]">
              {n.rotulo}
            </option>
          ))}
        </select>

        <label className="mb-1.5 mt-4 block text-[12.5px] font-medium text-[#9aa3c7]">
          E-mail
        </label>
        <Campo
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="voce@exemplo.com"
        />

        <label className="mb-1.5 mt-4 block text-[12.5px] font-medium text-[#9aa3c7]">
          Senha
        </label>
        <CampoSenha
          value={senha}
          onChange={setSenha}
          autoComplete="new-password"
          placeholder="Crie uma senha"
        />
        <ChecklistSenha senha={senha} />

        <BotaoPrimario
          type="submit"
          disabled={!podeEnviar || enviando}
          className="mt-6"
        >
          {enviando ? "Criando conta..." : "Criar conta"}
        </BotaoPrimario>

        <div className="mt-5 border-t border-white/10 pt-5 text-center text-[13.5px] text-[#9aa3c7]">
          Já tem conta?{" "}
          <Link
            href="/"
            className="font-semibold text-white underline decoration-[#7c3aed] decoration-2 underline-offset-2"
          >
            Entrar
          </Link>
        </div>
      </form>
    </main>
  );
}
