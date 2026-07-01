"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ADMIN_EMAIL } from "@/lib/auth";
import { corDoNicho, NICHOS, type Nicho } from "@/lib/nichos";

type Profissional = {
  id: string;
  nome: string;
  nicho: string;
  email: string;
  plano: "ativo" | "inadimplente";
  valor_mensal: number;
  criado_em: string;
};

function rotuloNicho(nicho: string): string {
  return NICHOS[nicho as Nicho]?.rotulo ?? nicho;
}
function moeda(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function dataBR(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR");
}

// Cores fixas da plataforma (admin nao usa cor de nicho).
const AZUL = "#4f9bff";
const OURO = "#fbbf24";
const GRAD = "var(--grad)"; // azul -> violeta (default das CSS vars)

export default function AdminPage() {
  const router = useRouter();
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [profs, setProfs] = useState<Profissional[]>([]);
  const [ocupadoId, setOcupadoId] = useState<string | null>(null);
  const [modoEscuro, setModoEscuro] = useState(true);
  const [busca, setBusca] = useState("");
  const [menuAberto, setMenuAberto] = useState(false);

  // ---------- Persistir preferência de tema ----------
  useEffect(() => {
    const saved = localStorage.getItem("sonay-admin-modo-escuro");
    if (saved === "false") setModoEscuro(false);
  }, []);
  useEffect(() => {
    localStorage.setItem("sonay-admin-modo-escuro", String(modoEscuro));
  }, [modoEscuro]);

  // ---------- Carregar (só admin) ----------
  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/");
        return;
      }
      if (user.email?.toLowerCase() !== ADMIN_EMAIL) {
        router.replace("/profissional");
        return;
      }

      // RLS admin_le_todos: o admin enxerga todos os profissionais.
      const { data, error } = await supabase
        .from("profissionais")
        .select("id, nome, nicho, email, plano, valor_mensal, criado_em")
        .order("criado_em", { ascending: false });
      if (error) {
        setErro(error.message);
        setCarregando(false);
        return;
      }
      setProfs(
        ((data as Profissional[]) ?? []).map((p) => ({
          ...p,
          valor_mensal: Number(p.valor_mensal ?? 0),
        })),
      );
      setCarregando(false);
    })();
  }, [router]);

  // ---------- Resumo ----------
  const resumo = useMemo(() => {
    const ativos = profs.filter((p) => p.plano === "ativo");
    const receita = ativos.reduce((s, p) => s + (p.valor_mensal || 0), 0);
    return {
      ativos: ativos.length,
      inadimplentes: profs.filter((p) => p.plano === "inadimplente").length,
      receita,
      total: profs.length,
      ticket: ativos.length ? receita / ativos.length : 0,
    };
  }, [profs]);

  // ---------- Série mensal (dados reais) ----------
  // Últimos 8 meses: novos cadastros e receita acumulada dos ativos.
  const serie = useMemo(() => {
    const agora = new Date();
    const meses: { rotulo: string; ini: Date; fim: Date }[] = [];
    for (let i = 7; i >= 0; i--) {
      const ini = new Date(agora.getFullYear(), agora.getMonth() - i, 1);
      const fim = new Date(agora.getFullYear(), agora.getMonth() - i + 1, 1);
      meses.push({
        rotulo: ini.toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""),
        ini,
        fim,
      });
    }
    return meses.map((m) => {
      const novos = profs.filter((p) => {
        const c = new Date(p.criado_em);
        return c >= m.ini && c < m.fim;
      }).length;
      const receitaAcum = profs
        .filter((p) => p.plano === "ativo" && new Date(p.criado_em) < m.fim)
        .reduce((s, p) => s + (p.valor_mensal || 0), 0);
      return { rotulo: m.rotulo, novos, receitaAcum };
    });
  }, [profs]);

  const profsFiltrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return profs;
    return profs.filter(
      (p) =>
        p.nome.toLowerCase().includes(q) ||
        p.email?.toLowerCase().includes(q) ||
        rotuloNicho(p.nicho).toLowerCase().includes(q),
    );
  }, [profs, busca]);

  // ---------- Tema ----------
  const t = useMemo(() =>
    modoEscuro
      ? {
          pageBg: "#070912",
          sideBg: "#0b0e1a",
          cardBg: "rgba(255,255,255,0.045)",
          cardBorder: "rgba(255,255,255,0.10)",
          inputBg: "rgba(255,255,255,0.04)",
          texto: "#f4f6ff",
          textoSec: "#9aa3c7",
          textoMuto: "rgba(154,163,199,0.6)",
          grid: "rgba(255,255,255,0.08)",
          navHover: "rgba(255,255,255,0.06)",
        }
      : {
          pageBg: "#eef1fb",
          sideBg: "#ffffff",
          cardBg: "#ffffff",
          cardBorder: "#e4e8f4",
          inputBg: "#f6f8fd",
          texto: "#12142a",
          textoSec: "#5a6187",
          textoMuto: "#8a90ad",
          grid: "#e4e8f4",
          navHover: "#f0f2f9",
        },
    [modoEscuro],
  );

  // ---------- Ações ----------
  async function mudarPlano(id: string, plano: Profissional["plano"]) {
    setErro(null);
    setOcupadoId(id);
    const { error } = await supabase
      .from("profissionais")
      .update({ plano })
      .eq("id", id);
    setOcupadoId(null);
    if (error) {
      setErro(error.message);
      return;
    }
    setProfs((prev) => prev.map((p) => (p.id === id ? { ...p, plano } : p)));
  }

  async function remover(id: string, nome: string) {
    if (
      !window.confirm(
        `Remover "${nome}" do sistema? Isso apaga o perfil, os horários e os agendamentos dele. Esta ação não pode ser desfeita.`,
      )
    )
      return;
    setErro(null);
    setOcupadoId(id);
    const { error } = await supabase
      .from("profissionais")
      .delete()
      .eq("id", id);
    setOcupadoId(null);
    if (error) {
      setErro(error.message);
      return;
    }
    setProfs((prev) => prev.filter((p) => p.id !== id));
  }

  function editarValorLocal(id: string, valor: number) {
    setProfs((prev) =>
      prev.map((p) => (p.id === id ? { ...p, valor_mensal: valor } : p)),
    );
  }

  async function salvarValor(id: string, valor: number) {
    setErro(null);
    const { error } = await supabase
      .from("profissionais")
      .update({ valor_mensal: valor })
      .eq("id", id);
    if (error) setErro(error.message);
  }

  async function sair() {
    await supabase.auth.signOut();
    router.replace("/");
  }

  // =====================================================================
  if (carregando) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#070912] text-[#9aa3c7]">
        Carregando...
      </main>
    );
  }

  const navItens = [
    { icone: "📊", rotulo: "Visão geral", href: "#topo" },
    { icone: "💳", rotulo: "Contas", href: "#contas" },
    { icone: "📈", rotulo: "Métricas", href: "#metricas" },
  ];

  return (
    <div id="topo" className="min-h-screen" style={{ background: t.pageBg, color: t.texto }}>
      <div className="mx-auto flex min-h-screen max-w-[1280px]">
        {/* Backdrop do drawer (mobile/tablet) */}
        {menuAberto && (
          <div
            className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm lg:hidden"
            onClick={() => setMenuAberto(false)}
            aria-hidden
          />
        )}

        {/* ================= SIDEBAR ================= */}
        <aside
          className={
            "fixed inset-y-0 left-0 z-40 flex h-screen w-64 shrink-0 flex-col justify-between px-4 py-5 shadow-2xl transition-transform duration-300 lg:sticky lg:top-0 lg:z-auto lg:w-60 lg:translate-x-0 lg:shadow-none " +
            (menuAberto ? "translate-x-0" : "-translate-x-full")
          }
          style={{ background: t.sideBg, borderRight: `1px solid ${t.cardBorder}` }}
        >
          <div>
            <div className="flex items-center gap-2.5 px-2">
              <span
                className="flex h-9 w-9 items-center justify-center rounded-[11px] font-display text-lg font-extrabold text-white"
                style={{ background: GRAD }}
              >
                S
              </span>
              <span className="font-display text-[18px] font-bold">AgendaSonay</span>
            </div>

            <nav className="mt-8 space-y-1">
              <div className="px-2 pb-1 font-grotesk text-[11px] uppercase tracking-wider" style={{ color: t.textoMuto }}>
                Administração
              </div>
              {navItens.map((n, i) => (
                <a
                  key={n.rotulo}
                  href={n.href}
                  onClick={() => setMenuAberto(false)}
                  className="flex items-center gap-3 rounded-[11px] px-3 py-2.5 text-sm font-medium transition"
                  style={
                    i === 0
                      ? { background: GRAD, color: "#fff" }
                      : { color: t.textoSec }
                  }
                  onMouseEnter={(e) => { if (i !== 0) e.currentTarget.style.background = t.navHover; }}
                  onMouseLeave={(e) => { if (i !== 0) e.currentTarget.style.background = "transparent"; }}
                >
                  <span aria-hidden>{n.icone}</span>
                  {n.rotulo}
                </a>
              ))}
            </nav>
          </div>

          <button
            onClick={sair}
            className="flex items-center gap-3 rounded-[11px] px-3 py-2.5 text-sm font-medium transition"
            style={{ color: t.textoSec }}
            onMouseEnter={(e) => { e.currentTarget.style.background = t.navHover; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            <span aria-hidden>↩️</span> Sair
          </button>
        </aside>

        {/* ================= CONTEÚDO ================= */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* -------- Topbar -------- */}
          <header
            className="sticky top-0 z-20 flex items-center gap-3 px-5 py-3.5 backdrop-blur-md"
            style={{
              background: modoEscuro ? "rgba(7,9,18,0.6)" : "rgba(255,255,255,0.75)",
              borderBottom: `1px solid ${t.cardBorder}`,
            }}
          >
            {/* botão do menu (abre a sidebar no mobile/tablet) */}
            <button
              onClick={() => setMenuAberto(true)}
              aria-label="Abrir menu"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] text-lg lg:hidden"
              style={{ background: t.inputBg, border: `1px solid ${t.cardBorder}`, color: t.texto }}
            >
              ☰
            </button>

            <div
              className="flex flex-1 items-center gap-2 rounded-full px-4 py-2"
              style={{ background: t.inputBg, border: `1px solid ${t.cardBorder}` }}
            >
              <span aria-hidden style={{ color: t.textoMuto }}>🔍</span>
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar negócio, e-mail ou nicho..."
                className="w-full bg-transparent text-sm outline-none"
                style={{ color: t.texto }}
              />
            </div>

            <button
              onClick={() => setModoEscuro((v) => !v)}
              title={modoEscuro ? "Modo claro" : "Modo escuro"}
              className="flex items-center gap-1 rounded-full p-1"
              style={{ background: t.inputBg, border: `1px solid ${t.cardBorder}` }}
            >
              <span
                className="flex h-7 w-7 items-center justify-center rounded-full text-sm transition"
                style={!modoEscuro ? { background: GRAD } : {}}
              >
                ☀️
              </span>
              <span
                className="flex h-7 w-7 items-center justify-center rounded-full text-sm transition"
                style={modoEscuro ? { background: GRAD } : {}}
              >
                🌙
              </span>
            </button>

            <div className="flex items-center gap-2">
              <div className="hidden text-right sm:block">
                <div className="text-[13px] font-semibold leading-tight">Sonay Admin</div>
                <div className="text-[11px]" style={{ color: t.textoMuto }}>Administrador</div>
              </div>
              <span
                className="flex h-9 w-9 items-center justify-center rounded-full font-display text-sm font-bold text-white"
                style={{ background: GRAD }}
              >
                S
              </span>
            </div>
          </header>

          <main className="flex-1 px-5 py-6">
            <div className="mb-5">
              <h1 className="font-display text-[26px] font-extrabold leading-tight">
                AgendaSonay Admin — Visão geral
              </h1>
              <p className="mt-1 text-[13.5px]" style={{ color: t.textoSec }}>
                Receita, contas e mensalidades dos negócios cadastrados.
              </p>
            </div>

            {erro && (
              <div className="mb-5 rounded-xl border border-[#fb7185]/40 bg-[#fb7185]/10 px-4 py-3 text-sm text-[#fb7185]">
                {erro}
              </div>
            )}

            {/* -------- Cards de métricas -------- */}
            <section className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
              <Card t={t}>
                <div className="text-[12px]" style={{ color: t.textoSec }}>Receita recorrente / mês</div>
                <div className="text-grad mt-1.5 font-display text-[26px] font-extrabold">
                  {moeda(resumo.receita)}
                </div>
                <div className="mt-1 text-[11.5px]" style={{ color: t.textoMuto }}>
                  Ticket médio {moeda(resumo.ticket)}
                </div>
              </Card>
              <Card t={t}>
                <div className="text-[12px]" style={{ color: t.textoSec }}>Negócios ativos</div>
                <div className="mt-1.5 font-display text-[26px] font-extrabold" style={{ color: AZUL }}>
                  {resumo.ativos}
                </div>
                <div className="mt-1 text-[11.5px]" style={{ color: t.textoMuto }}>
                  de {resumo.total} cadastrados
                </div>
              </Card>
              <Card t={t}>
                <div className="text-[12px]" style={{ color: t.textoSec }}>Inadimplentes</div>
                <div className="mt-1.5 font-display text-[26px] font-extrabold" style={{ color: "#fb7185" }}>
                  {resumo.inadimplentes}
                </div>
                <div className="mt-1 text-[11.5px]" style={{ color: t.textoMuto }}>
                  suspensos do link público
                </div>
              </Card>
              <Card t={t}>
                <div className="text-[12px]" style={{ color: t.textoSec }}>Total de negócios</div>
                <div className="mt-1.5 font-display text-[26px] font-extrabold" style={{ color: OURO }}>
                  {resumo.total}
                </div>
                <div className="mt-1 text-[11.5px]" style={{ color: t.textoMuto }}>
                  {resumo.ativos} ativos · {resumo.inadimplentes} inadimplentes
                </div>
              </Card>
            </section>

            {/* -------- Gráficos -------- */}
            <section id="metricas" className="mt-4 grid grid-cols-1 gap-3.5 lg:grid-cols-3">
              <Card t={t} className="lg:col-span-2">
                <div className="mb-3 flex items-center justify-between">
                  <div className="font-display text-[16px] font-bold">Crescimento (8 meses)</div>
                  <div className="flex items-center gap-3 text-[11.5px]" style={{ color: t.textoSec }}>
                    <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full" style={{ background: AZUL }} /> Receita ativa</span>
                    <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full" style={{ background: OURO }} /> Novos cadastros</span>
                  </div>
                </div>
                <GraficoLinha serie={serie} grid={t.grid} textoMuto={t.textoMuto} />
              </Card>

              <Card t={t}>
                <div className="mb-3 font-display text-[16px] font-bold">Distribuição de planos</div>
                <Donut ativos={resumo.ativos} inadimplentes={resumo.inadimplentes} t={t} />
              </Card>
            </section>

            {/* -------- Tabela de contas -------- */}
            <section id="contas" className="mt-4">
              <Card t={t} className="!p-0 overflow-hidden">
                <div
                  className="flex items-center justify-between px-5 py-3.5"
                  style={{ borderBottom: `1px solid ${t.cardBorder}` }}
                >
                  <div className="font-display text-[16px] font-bold">Contas dos negócios</div>
                  <div className="text-[12px]" style={{ color: t.textoMuto }}>
                    {profsFiltrados.length} {profsFiltrados.length === 1 ? "negócio" : "negócios"}
                  </div>
                </div>

                {profsFiltrados.length === 0 ? (
                  <div className="px-5 py-10 text-center text-sm" style={{ color: t.textoMuto }}>
                    {profs.length === 0
                      ? "Nenhum profissional cadastrado ainda."
                      : "Nenhum resultado para a busca."}
                  </div>
                ) : (
                  <div style={{ borderColor: t.cardBorder }}>
                    {profsFiltrados.map((p) => {
                      const cor = corDoNicho(p.nicho);
                      const inadimplente = p.plano === "inadimplente";
                      const ocupado = ocupadoId === p.id;
                      return (
                        <div
                          key={p.id}
                          className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5"
                          style={{ borderTop: `1px solid ${t.cardBorder}` }}
                        >
                          {/* identidade */}
                          <div className="flex min-w-[190px] items-center gap-3">
                            <span
                              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-display text-sm font-bold text-white"
                              style={{ background: cor }}
                            >
                              {p.nome.charAt(0).toUpperCase()}
                            </span>
                            <div>
                              <div className="font-semibold">{p.nome}</div>
                              <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[12px]" style={{ color: t.textoSec }}>
                                <span
                                  className="rounded-full px-2 py-0.5 text-[11px] font-bold"
                                  style={{ background: cor + "26", color: cor }}
                                >
                                  {rotuloNicho(p.nicho)}
                                </span>
                                <span>desde {dataBR(p.criado_em)}</span>
                              </div>
                            </div>
                          </div>

                          {/* valor mensal (editável) */}
                          <label className="flex items-center gap-1.5 text-sm" style={{ color: t.textoSec }}>
                            R$
                            <input
                              type="number"
                              min={0}
                              step="0.01"
                              value={p.valor_mensal}
                              onChange={(e) =>
                                editarValorLocal(p.id, Number(e.target.value) || 0)
                              }
                              onBlur={() => salvarValor(p.id, p.valor_mensal)}
                              className="w-24 rounded-lg px-2.5 py-1.5 text-sm"
                              style={{ background: t.inputBg, border: `1px solid ${t.cardBorder}`, color: t.texto }}
                            />
                            /mês
                          </label>

                          {/* status + ações */}
                          <div className="flex items-center gap-2">
                            <span
                              className="rounded-full px-2.5 py-1 text-[11px] font-bold"
                              style={
                                inadimplente
                                  ? { background: "rgba(251,113,133,0.16)", color: "#fb7185", border: "1px solid rgba(251,113,133,0.3)" }
                                  : { background: "rgba(60,220,130,0.12)", color: "#3fbf7a", border: "1px solid rgba(60,220,130,0.25)" }
                              }
                            >
                              {inadimplente ? "inadimplente" : "ativo"}
                            </span>
                            <button
                              onClick={() =>
                                mudarPlano(p.id, inadimplente ? "ativo" : "inadimplente")
                              }
                              disabled={ocupado}
                              className="rounded-[9px] px-3 py-1.5 text-[13px] font-bold text-white transition disabled:opacity-50"
                              style={
                                inadimplente
                                  ? { background: GRAD }
                                  : { border: `1px solid ${t.cardBorder}`, color: t.textoSec, background: "transparent" }
                              }
                            >
                              {inadimplente ? "Reativar" : "Suspender"}
                            </button>
                            <button
                              onClick={() => remover(p.id, p.nome)}
                              disabled={ocupado}
                              className="rounded-[9px] px-3 py-1.5 text-[13px] font-medium transition disabled:opacity-50"
                              style={{ color: "#fb7185", border: "1px solid rgba(251,113,133,0.4)" }}
                            >
                              Remover
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>

              <p className="mt-4 text-center text-[12.5px]" style={{ color: t.textoMuto }}>
                Suspender = marca como inadimplente: o negócio some do link público e da
                lista de agendamento até regularizar.
              </p>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}

// ======================= Componentes visuais =======================

type Tema = {
  cardBg: string;
  cardBorder: string;
  textoMuto: string;
  grid: string;
  [k: string]: string;
};

function Card({
  children,
  t,
  className = "",
}: {
  children: React.ReactNode;
  t: Tema;
  className?: string;
}) {
  return (
    <div
      className={"rounded-[18px] p-5 " + className}
      style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}` }}
    >
      {children}
    </div>
  );
}

// Gráfico de linhas em SVG (duas séries normalizadas), sem dependências.
function GraficoLinha({
  serie,
  grid,
  textoMuto,
}: {
  serie: { rotulo: string; novos: number; receitaAcum: number }[];
  grid: string;
  textoMuto: string;
}) {
  const W = 640;
  const H = 220;
  const padL = 16;
  const padR = 16;
  const padT = 14;
  const padB = 26;
  const n = serie.length;

  const maxReceita = Math.max(1, ...serie.map((s) => s.receitaAcum));
  const maxNovos = Math.max(1, ...serie.map((s) => s.novos));

  const px = (i: number) => padL + (i * (W - padL - padR)) / Math.max(1, n - 1);
  const py = (v: number, max: number) =>
    padT + (1 - v / max) * (H - padT - padB);

  const ptsReceita = serie.map((s, i) => `${px(i)},${py(s.receitaAcum, maxReceita)}`);
  const ptsNovos = serie.map((s, i) => `${px(i)},${py(s.novos, maxNovos)}`);
  const areaReceita = `M ${px(0)},${H - padB} L ${ptsReceita.join(" L ")} L ${px(n - 1)},${H - padB} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" preserveAspectRatio="none" role="img" aria-label="Gráfico de crescimento">
      <defs>
        <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4f9bff" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#4f9bff" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* grade horizontal */}
      {[0, 0.25, 0.5, 0.75, 1].map((f) => {
        const y = padT + f * (H - padT - padB);
        return <line key={f} x1={padL} y1={y} x2={W - padR} y2={y} stroke={grid} strokeWidth="1" />;
      })}

      {/* área + linha da receita (azul) */}
      <path d={areaReceita} fill="url(#areaFill)" />
      <polyline points={ptsReceita.join(" ")} fill="none" stroke="#4f9bff" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {/* linha de novos cadastros (ouro) */}
      <polyline points={ptsNovos.join(" ")} fill="none" stroke="#fbbf24" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" strokeDasharray="1 0" />

      {/* pontos da receita */}
      {serie.map((s, i) => (
        <circle key={i} cx={px(i)} cy={py(s.receitaAcum, maxReceita)} r="3" fill="#4f9bff" />
      ))}

      {/* rótulos dos meses */}
      {serie.map((s, i) => (
        <text key={i} x={px(i)} y={H - 8} textAnchor="middle" fontSize="11" fill={textoMuto} fontFamily="Space Grotesk, sans-serif">
          {s.rotulo}
        </text>
      ))}
    </svg>
  );
}

// Donut ativos x inadimplentes.
function Donut({
  ativos,
  inadimplentes,
  t,
}: {
  ativos: number;
  inadimplentes: number;
  t: Tema;
}) {
  const total = ativos + inadimplentes;
  const r = 52;
  const c = 2 * Math.PI * r;
  const fracAtivos = total ? ativos / total : 0;
  const dashAtivos = `${fracAtivos * c} ${c}`;

  return (
    <div className="flex items-center gap-5">
      <svg viewBox="0 0 140 140" className="h-32 w-32 shrink-0" role="img" aria-label="Distribuição de planos">
        <circle cx="70" cy="70" r={r} fill="none" stroke="#fb7185" strokeWidth="16" opacity={total ? 1 : 0.25} />
        <circle
          cx="70"
          cy="70"
          r={r}
          fill="none"
          stroke="#4f9bff"
          strokeWidth="16"
          strokeDasharray={dashAtivos}
          strokeLinecap="round"
          transform="rotate(-90 70 70)"
        />
        <text x="70" y="66" textAnchor="middle" fontSize="26" fontWeight="700" fill={t.texto} fontFamily="Poppins, sans-serif">
          {total}
        </text>
        <text x="70" y="86" textAnchor="middle" fontSize="11" fill={t.textoMuto} fontFamily="Space Grotesk, sans-serif">
          negócios
        </text>
      </svg>
      <div className="space-y-3 text-sm">
        <div className="flex items-center gap-2">
          <i className="h-3 w-3 rounded-full" style={{ background: "#4f9bff" }} />
          <span style={{ color: t.textoSec }}>Ativos</span>
          <b style={{ color: t.texto }}>{ativos}</b>
        </div>
        <div className="flex items-center gap-2">
          <i className="h-3 w-3 rounded-full" style={{ background: "#fb7185" }} />
          <span style={{ color: t.textoSec }}>Inadimplentes</span>
          <b style={{ color: t.texto }}>{inadimplentes}</b>
        </div>
      </div>
    </div>
  );
}
