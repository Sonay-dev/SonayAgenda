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
      <form
        onSubmit={cadastrar}
        className="card-fade w-full max-w-[400px] rounded-[18px] bg-white p-7 shadow-xl"
      >
        <Marca />
        <h1 className="mt-6 text-center font-display text-[22px] font-semibold text-[#1a1a1a]">
          Cadastrar seu negócio
        </h1>
        <p className="mt-1 text-center text-sm text-[#777]">
          Crie sua conta para gerenciar a agenda.
        </p>

        {erro && (
          <div className="mt-4 rounded-lg border border-red-300 bg-red-50 px-3.5 py-2.5 text-sm text-red-800">
            {erro}
          </div>
        )}

        <label className="mb-1.5 mt-5 block text-[13px] font-medium text-[#666]">
          Nome do negócio
        </label>
        <Campo
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Ex.: Studio Léo Barbearia"
        />

        <label className="mb-1.5 mt-4 block text-[13px] font-medium text-[#666]">
          Nicho
        </label>
        <select
          value={nicho}
          onChange={(e) => setNicho(e.target.value as Nicho)}
          className="w-full rounded-[9px] border border-[#e6e0d4] bg-[#fafaf7] px-3.5 py-2.5 text-sm outline-none focus:border-[#15131f]"
        >
          {NICHOS_LISTA.map((n) => (
            <option key={n.valor} value={n.valor}>
              {n.rotulo}
            </option>
          ))}
        </select>

        <label className="mb-1.5 mt-4 block text-[13px] font-medium text-[#666]">
          E-mail
        </label>
        <Campo
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="voce@exemplo.com"
        />

        <label className="mb-1.5 mt-4 block text-[13px] font-medium text-[#666]">
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

        <div className="mt-5 border-t border-[#eee] pt-5 text-center text-sm text-[#777]">
          Já tem conta?{" "}
          <Link href="/" className="font-semibold text-[#15131f] underline">
            Entrar
          </Link>
        </div>
      </form>
    </main>
  );
}
