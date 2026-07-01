"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Marca,
  CampoSenha,
  BotaoPrimario,
  telaEscura,
  cartaoVidro,
  AuroraPlataforma,
} from "../../_components/ui";
import { supabase } from "@/lib/supabase";
import { ADMIN_EMAIL } from "@/lib/auth";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [entrando, setEntrando] = useState(false);

  // Se já houver sessão de admin, entra direto no painel.
  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user?.email?.toLowerCase() === ADMIN_EMAIL) router.replace("/admin");
    })();
  }, [router]);

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
          : error.message,
      );
      return;
    }
    // Só o e-mail de administrador pode entrar por aqui.
    if (data.user?.email?.toLowerCase() !== ADMIN_EMAIL) {
      await supabase.auth.signOut();
      setEntrando(false);
      setErro("Esta conta não é de administrador. Use a entrada normal.");
      return;
    }
    localStorage.setItem("sonay-lembrar", "true");
    router.replace("/admin");
  }

  return (
    <main className={telaEscura}>
      <AuroraPlataforma />
      <form onSubmit={entrar} className={cartaoVidro}>
        <Marca />
        <h1 className="mt-6 text-center font-display text-[21px] font-bold text-white">
          Acesso do administrador
        </h1>
        <p className="mt-1.5 text-center text-[13.5px] text-[#9aa3c7]">
          Entre com a conta de administrador para gerenciar contas e mensalidades.
        </p>

        {erro && (
          <div className="mt-4 rounded-xl border border-red-400/40 bg-red-500/15 px-3.5 py-2.5 text-sm text-[#ffb4b4]">
            {erro}
          </div>
        )}

        <label className="mb-1.5 mt-5 block text-[12.5px] font-medium text-[#9aa3c7]">
          E-mail de administrador
        </label>
        <input
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="admin@exemplo.com"
          className="w-full rounded-[13px] border border-white/10 bg-white/[0.04] px-3.5 py-3 text-sm text-[#f4f6ff] outline-none transition placeholder:text-[#5c6486] focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/40"
        />

        <label className="mb-1.5 mt-4 block text-[12.5px] font-medium text-[#9aa3c7]">
          Senha
        </label>
        <CampoSenha
          value={senha}
          onChange={setSenha}
          autoComplete="current-password"
          placeholder="Sua senha de admin"
        />

        <div className="mt-3 text-right">
          <Link
            href="/esqueci-senha"
            className="text-[12.5px] text-[#a78bfa] hover:text-white"
          >
            Esqueci minha senha
          </Link>
        </div>

        <BotaoPrimario type="submit" disabled={entrando} className="mt-5">
          {entrando ? "Entrando..." : "Entrar como administrador"}
        </BotaoPrimario>

        <div className="mt-5 border-t border-white/10 pt-5 text-center text-[13.5px] text-[#9aa3c7]">
          Não é administrador?{" "}
          <Link
            href="/"
            className="font-semibold text-white underline decoration-[#7c3aed] decoration-2 underline-offset-2"
          >
            Entrada normal
          </Link>
        </div>
      </form>
    </main>
  );
}
