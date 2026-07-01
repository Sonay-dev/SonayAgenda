import Link from "next/link";
import { Marca, telaEscura, cartaoVidro, AuroraPlataforma } from "../../_components/ui";

// Tela mostrada apos o cadastro: o profissional precisa confirmar o e-mail.
export default function VerifiquePage() {
  return (
    <main className={telaEscura}>
      <AuroraPlataforma />
      <div className={cartaoVidro + " text-center"}>
        <Marca />
        <div className="mt-6 text-[44px]">📩</div>
        <h1 className="mt-2 font-display text-[21px] font-bold text-white">
          Confirme seu e-mail
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-[#9aa3c7]">
          Enviamos um link de confirmação para o seu e-mail. Abra a mensagem e
          clique no link para ativar sua conta e entrar no painel.
        </p>
        <p className="mt-3 text-[13px] text-[#5c6486]">
          Não chegou? Verifique a caixa de spam.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block text-sm font-medium text-[#a78bfa] hover:text-white"
        >
          Voltar para o login
        </Link>
      </div>
    </main>
  );
}
