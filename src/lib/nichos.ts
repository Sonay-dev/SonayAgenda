export type Nicho =
  | "barbearia"
  | "salao"
  | "estetica"
  | "fisioterapia"
  | "personal";

type CoresNicho = {
  rotulo: string;
  fundoEscuro: string;
  destaque: string;
  fundoClaro: string;
  forte: string;
};

export const NICHOS: Record<Nicho, CoresNicho> = {
  barbearia:    { rotulo: "Barbearia",        fundoEscuro: "#1A1A1A", destaque: "#C9A96E", fundoClaro: "#F5F0E8", forte: "#8B6914" },
  salao:        { rotulo: "Salão de Beleza",  fundoEscuro: "#1C1224", destaque: "#E8A0BF", fundoClaro: "#FAF5FF", forte: "#9D4E72" },
  estetica:     { rotulo: "Estética",         fundoEscuro: "#0D1F1A", destaque: "#7EC8A4", fundoClaro: "#F2FAF6", forte: "#2E7D57" },
  fisioterapia: { rotulo: "Fisioterapia",     fundoEscuro: "#0A1628", destaque: "#5BAFD6", fundoClaro: "#EFF7FB", forte: "#1A6E96" },
  personal:     { rotulo: "Personal Trainer", fundoEscuro: "#1A1000", destaque: "#F5A623", fundoClaro: "#FFFBF0", forte: "#C47D0A" },
};

export const NICHOS_LISTA = (Object.keys(NICHOS) as Nicho[]).map((valor) => ({
  valor,
  ...NICHOS[valor],
}));

const CORES_FALLBACK: CoresNicho = {
  rotulo: "",
  fundoEscuro: "#1a1a1a",
  destaque: "#4f46e5",
  fundoClaro: "#f4f1ea",
  forte: "#4f46e5",
};

export function coresDoNicho(nicho: string): CoresNicho {
  return NICHOS[nicho as Nicho] ?? CORES_FALLBACK;
}

// Mantido para compatibilidade (admin usa só esta função).
export function corDoNicho(nicho: string): string {
  return coresDoNicho(nicho).destaque;
}
