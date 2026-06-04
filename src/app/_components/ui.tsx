"use client";

import { useState } from "react";

// Wrapper das telas de entrada: fundo escuro da marca, conteudo centralizado.
export const telaEscura =
  "flex min-h-screen flex-col items-center justify-center bg-[#15131f] px-5 py-10";

// Marca AgendaSonay (badge "S" + nome), usada no topo dos cartoes.
export function Marca() {
  return (
    <div className="flex items-center justify-center gap-2.5">
      <span
        className="flex h-9 w-9 items-center justify-center rounded-[10px] font-display text-lg font-bold text-white"
        style={{ background: "linear-gradient(135deg,#22d3ee,#a855f7)" }}
      >
        S
      </span>
      <span className="font-display text-xl font-semibold text-[#1a1a1a]">
        AgendaSonay
      </span>
    </div>
  );
}

const baseCampo =
  "w-full rounded-[9px] border border-[#e6e0d4] bg-[#fafaf7] px-3.5 py-2.5 text-sm outline-none focus:border-[#15131f]";

// Campo de senha com botao de ver/ocultar (olho).
export function CampoSenha({
  value,
  onChange,
  placeholder = "Sua senha",
  autoComplete = "current-password",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
}) {
  const [ver, setVer] = useState(false);
  return (
    <div className="relative">
      <input
        type={ver ? "text" : "password"}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={baseCampo + " pr-11"}
      />
      <button
        type="button"
        onClick={() => setVer((v) => !v)}
        aria-label={ver ? "Ocultar senha" : "Mostrar senha"}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-[#888] hover:text-[#15131f]"
      >
        {ver ? <OlhoCortado /> : <Olho />}
      </button>
    </div>
  );
}

// Campo de texto simples (e-mail, nome do negocio).
export function Campo(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={baseCampo + " " + (props.className ?? "")} />;
}

// ----------------------------------------------------------------------
// Validacao de senha (cadastro e redefinicao): minimo 8 caracteres,
// 1 maiuscula, 1 numero e 1 caractere especial.
// ----------------------------------------------------------------------
export const REGRAS_SENHA = [
  { rotulo: "Mínimo 8 caracteres", testa: (s: string) => s.length >= 8 },
  { rotulo: "1 letra maiúscula", testa: (s: string) => /[A-Z]/.test(s) },
  { rotulo: "1 número", testa: (s: string) => /[0-9]/.test(s) },
  {
    rotulo: "1 caractere especial (@#$!%…)",
    testa: (s: string) => /[^A-Za-z0-9]/.test(s),
  },
] as const;

export function senhaValida(senha: string): boolean {
  return REGRAS_SENHA.every((r) => r.testa(senha));
}

// Checklist em tempo real: cada regra fica verde quando atendida.
// So aparece depois que o usuario comeca a digitar.
export function ChecklistSenha({ senha }: { senha: string }) {
  if (senha.length === 0) return null;
  return (
    <ul className="mt-2 space-y-1">
      {REGRAS_SENHA.map((r) => {
        const ok = r.testa(senha);
        return (
          <li
            key={r.rotulo}
            className="flex items-center gap-2 text-[13px]"
            style={{ color: ok ? "#2a8a4a" : "#999" }}
          >
            <span
              className="flex h-4 w-4 flex-none items-center justify-center rounded-full text-[10px] font-bold text-white"
              style={{ background: ok ? "#2a8a4a" : "#cfcabd" }}
            >
              {ok ? "✓" : ""}
            </span>
            {r.rotulo}
          </li>
        );
      })}
    </ul>
  );
}

// Botao primario escuro (largura total).
export function BotaoPrimario({
  children,
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={
        "w-full rounded-[10px] bg-[#15131f] py-3 text-[15px] font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-50 " +
        className
      }
    >
      {children}
    </button>
  );
}

function Olho() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function OlhoCortado() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c6.5 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61A13.5 13.5 0 0 0 2 12s3.5 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
      <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
      <line x1="2" y1="2" x2="22" y2="22" />
    </svg>
  );
}
