// Service worker minimo do AgendaSonay.
// Objetivo nesta fase: tornar o app instalavel (o navegador exige um SW
// com handler de fetch). Sem cache offline agressivo ainda — apenas
// repassa as requisicoes para a rede. Cache offline entra numa fase futura.

self.addEventListener("install", () => {
  // Ativa a nova versao do SW imediatamente.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // Assume o controle das abas abertas sem precisar recarregar.
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
  // Passthrough: deixa o navegador buscar normalmente na rede.
  // (Handler presente de proposito para habilitar o prompt de instalacao.)
});
