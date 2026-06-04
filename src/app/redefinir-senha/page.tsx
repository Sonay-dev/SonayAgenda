"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Marca,
  CampoSenha,
  ChecklistSenha,
  senhaValida,
  BotaoPrimario,
  telaEscura,
} from "../_components/ui";
import { supabase } from "@/lib/supabase";

/**
 * Chegada via link de recuperacao: o route handler /auth/confirm ja validou
 * o token e criou a sessao temporaria. Aqui o usuario define a nova senha.
 */
export default function RedefinirSenhaPage() {
  const router = useRouter();
  const [senha, setSenha] = useState("");
  const [confirma, setConfirma] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [salvando, setSalvando] = useState(false);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (!senhaValida(senha)) {
      setErro("A senha não atende a todas as regras.");
      return;
    }
    if (senha !== confirma) {
      setErro("As senhas não conferem.");
      return;
    }
    setSalvando(true);
    const { error } = await supabase.auth.updateUser({ password: senha });
    setSalvando(false);
    if (error) {
      setErro(
        error.message.includes("Auth session missing")
          ? "O link expirou ou já foi usado. Peça um novo em 'Esqueci minha senha'."
          : error.message,
      );
      return;
    }
    setOk(true);
    setTimeout(() => router.replace("/"), 1500);
  }

  return (
    <main className={telaEscura}>
      <div className="card-fade w-full max-w-[400px] rounded-[18px] bg-white p-7 shadow-xl">
        <Marca />

        {ok ? (
          <div className="mt-6 text-center">
            <div className="text-[44px]">✅</div>
            <h1 className="mt-2 font-display text-[22px] font-semibold text-[#1a1a1a]">
              Senha alterada!
            </h1>
            <p className="mt-2 text-sm text-[#666]">
              Redirecionando para o login...
            </p>
          </div>
        ) : (
          <form onSubmit={salvar}>
            <h1 className="mt-6 text-center font-display text-[22px] font-semibold text-[#1a1a1a]">
              Nova senha
            </h1>
            <p className="mt-1 text-center text-sm text-[#777]">
              Escolha uma nova senha para sua conta.
            </p>

            {erro && (
              <div className="mt-4 rounded-lg border border-red-300 bg-red-50 px-3.5 py-2.5 text-sm text-red-800">
                {erro}
              </div>
            )}

            <label className="mb-1.5 mt-5 block text-[13px] font-medium text-[#666]">
              Nova senha
            </label>
            <CampoSenha
              value={senha}
              onChange={setSenha}
              autoComplete="new-password"
              placeholder="Crie uma senha"
            />
            <ChecklistSenha senha={senha} />

            <label className="mb-1.5 mt-4 block text-[13px] font-medium text-[#666]">
              Confirmar senha
            </label>
            <CampoSenha
              value={confirma}
              onChange={setConfirma}
              autoComplete="new-password"
              placeholder="Repita a senha"
            />

            <BotaoPrimario
              type="submit"
              disabled={salvando || !senhaValida(senha) || senha !== confirma}
              className="mt-6"
            >
              {salvando ? "Salvando..." : "Salvar nova senha"}
            </BotaoPrimario>

            <div className="mt-5 text-center text-sm">
              <Link href="/" className="text-[#15131f] underline opacity-70">
                Voltar para o login
              </Link>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
