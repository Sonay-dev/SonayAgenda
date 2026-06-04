import Link from "next/link";
import { Marca, telaEscura } from "../../_components/ui";

// Tela mostrada apos o cadastro: o profissional precisa confirmar o e-mail.
export default function VerifiquePage() {
  return (
    <main className={telaEscura}>
      <div className="card-fade w-full max-w-[400px] rounded-[18px] bg-white p-8 text-center shadow-xl">
        <Marca />
        <div className="mt-6 text-[44px]">📩</div>
        <h1 className="mt-2 font-display text-[22px] font-semibold text-[#1a1a1a]">
          Confirme seu e-mail
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-[#666]">
          Enviamos um link de confirmação para o seu e-mail. Abra a mensagem e
          clique no link para ativar sua conta e entrar no painel.
        </p>
        <p className="mt-3 text-[13px] text-[#999]">
          Não chegou? Verifique a caixa de spam.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block text-sm font-medium text-[#15131f] underline"
        >
          Voltar para o login
        </Link>
      </div>
    </main>
  );
}
