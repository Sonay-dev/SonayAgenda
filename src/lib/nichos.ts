// Nichos do AgendaSonay: rotulo + cor de destaque (prd.md secao 10).
// As chaves precisam bater com o enum `nicho` do banco (supabase/schema.sql).
export type Nicho =
  | "barbearia"
  | "salao"
  | "estetica"
  | "fisioterapia"
  | "personal";

export const NICHOS: Record<Nicho, { cor: string; rotulo: string }> = {
  barbearia: { cor: "#d4915d", rotulo: "Barbearia" }, // laranja
  salao: { cor: "#b07bc9", rotulo: "Salão de Beleza" }, // roxo
  estetica: { cor: "#c97b94", rotulo: "Estética" }, // rosa
  fisioterapia: { cor: "#5bb3a3", rotulo: "Fisioterapia" }, // verde-água
  personal: { cor: "#5d9bd4", rotulo: "Personal Trainer" }, // azul
};

// Lista ordenada para montar os <select> de cadastro.
export const NICHOS_LISTA = (Object.keys(NICHOS) as Nicho[]).map((valor) => ({
  valor,
  ...NICHOS[valor],
}));

// Cor de fallback caso venha um nicho novo ainda sem cor definida.
export function corDoNicho(nicho: string): string {
  return NICHOS[nicho as Nicho]?.cor ?? "#1a1a1a";
}
