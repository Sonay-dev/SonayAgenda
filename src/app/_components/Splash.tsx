"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

const DURACAO_MS = 1600; // tempo visivel antes do fade
const FADE_MS = 400; // duracao do fade-out
const FLAG = "agendasonay_splash_visto"; // mostra 1x por sessao

/**
 * Tela de abertura da marca: logo sobre o fundo escuro #15131f.
 * Aparece uma vez por sessao (em PWA standalone, cada abertura fria do app
 * e uma nova sessao, entao reaparece). Depois some com fade e revela o
 * conteudo (a tela de login) por baixo.
 */
export default function Splash({ children }: { children: React.ReactNode }) {
  // Decide no proprio cliente se mostra (esta subarvore so renderiza no
  // cliente, por causa do Suspense/useSearchParams na pagina de login),
  // entao da pra ler o sessionStorage ja na inicializacao — sem flash.
  const [mostrar, setMostrar] = useState(
    () => typeof window !== "undefined" && !sessionStorage.getItem(FLAG),
  );
  const [saindo, setSaindo] = useState(false);

  useEffect(() => {
    if (!mostrar) return;
    sessionStorage.setItem(FLAG, "1");

    // setState fica dentro dos timers (sincronizacao temporal), nao no corpo.
    const t1 = setTimeout(() => setSaindo(true), DURACAO_MS);
    const t2 = setTimeout(() => setMostrar(false), DURACAO_MS + FADE_MS);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [mostrar]);

  return (
    <>
      {children}
      {mostrar && (
        <div
          aria-hidden
          className="fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-[400ms]"
          style={{ background: "#15131f", opacity: saindo ? 0 : 1 }}
        >
          <Image
            src="/splash-1024.png"
            alt="AgendaSonay"
            width={220}
            height={220}
            priority
            className="h-auto w-[min(55vw,220px)]"
          />
        </div>
      )}
    </>
  );
}
