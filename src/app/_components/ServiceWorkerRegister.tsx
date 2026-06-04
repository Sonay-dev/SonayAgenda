"use client";

import { useEffect } from "react";

/**
 * Registra o service worker (/sw.js) no carregamento do app.
 * Nao renderiza nada — so liga o PWA. Fica no layout para valer em
 * todas as paginas.
 */
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const onLoad = () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch((err) => console.error("Falha ao registrar o service worker:", err));
    };
    window.addEventListener("load", onLoad);
    return () => window.removeEventListener("load", onLoad);
  }, []);

  return null;
}
