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

export default function AdminPage() {
  const router = useRouter();
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [profs, setProfs] = useState<Profissional[]>([]);
  const [ocupadoId, setOcupadoId] = useState<string | null>(null);

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
    return {
      ativos: ativos.length,
      inadimplentes: profs.filter((p) => p.plano === "inadimplente").length,
      receita: ativos.reduce((s, p) => s + (p.valor_mensal || 0), 0),
    };
  }, [profs]);

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
      <main className="flex min-h-screen items-center justify-center bg-[#15131f] text-[#9aa]">
        Carregando...
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-[#15131f] text-[#f4f1ea]">
      {/* ---------- Cabeçalho ---------- */}
      <header
        className="text-white"
        style={{ background: "linear-gradient(135deg,#4f46e5,#7c3aed)" }}
      >
        <div className="mx-auto flex max-w-[1000px] items-center justify-between gap-3 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span
              className="flex h-[30px] w-[30px] items-center justify-center rounded-lg font-display font-bold text-white"
              style={{ background: "linear-gradient(135deg,#22d3ee,#a855f7)" }}
            >
              S
            </span>
            <div>
              <div className="font-display text-[19px] font-semibold">
                AgendaSonay
              </div>
              <div className="text-xs opacity-80">Administração</div>
            </div>
          </div>
          <button
            onClick={sair}
            className="rounded-[9px] border border-white/30 px-4 py-2 text-sm font-medium transition hover:bg-white/15"
          >
            Sair
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1000px] px-5 py-7">
        {erro && (
          <div className="mb-5 rounded-xl border border-[#fb7185]/40 bg-[#fb7185]/10 px-4 py-3 text-sm text-[#fb7185]">
            {erro}
          </div>
        )}

        {/* ---------- Cards de resumo ---------- */}
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-[14px] border border-[#2d2a3e] bg-[#1e1b2e] p-4">
            <div className="text-xs text-[#9b96b0]">Receita recorrente / mês</div>
            <div className="mt-1 font-display text-3xl font-bold text-[#fbbf24]">
              {moeda(resumo.receita)}
            </div>
          </div>
          <div className="rounded-[14px] border border-[#2d2a3e] bg-[#1e1b2e] p-4">
            <div className="text-xs text-[#9b96b0]">Profissionais ativos</div>
            <div className="mt-1 font-display text-3xl font-bold text-[#4f46e5]">
              {resumo.ativos}
            </div>
          </div>
          <div className="rounded-[14px] border border-[#2d2a3e] bg-[#1e1b2e] p-4">
            <div className="text-xs text-[#9b96b0]">Inadimplentes</div>
            <div className="mt-1 font-display text-3xl font-bold text-[#fb7185]">
              {resumo.inadimplentes}
            </div>
          </div>
        </section>

        {/* ---------- Tabela de profissionais ---------- */}
        <section className="mt-6 overflow-hidden rounded-[14px] border border-[#2d2a3e] bg-[#1e1b2e]">
          <div className="border-b border-[#2d2a3e] px-5 py-3.5 font-display text-[17px] font-bold text-white">
            Profissionais cadastrados
          </div>

          {profs.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-[#9b96b0]">
              Nenhum profissional cadastrado ainda.
            </div>
          ) : (
            <div className="divide-y divide-[#2d2a3e]">
              {profs.map((p) => {
                const cor = corDoNicho(p.nicho);
                const inadimplente = p.plano === "inadimplente";
                const ocupado = ocupadoId === p.id;
                return (
                  <div
                    key={p.id}
                    className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5"
                  >
                    {/* identidade */}
                    <div className="min-w-[180px]">
                      <div className="font-bold text-white">{p.nome}</div>
                      <div className="mt-0.5 flex items-center gap-2 text-[13px] text-[#9b96b0]">
                        <span
                          className="rounded-full px-2 py-0.5 text-xs font-bold"
                          style={{ background: cor + "33", color: cor }}
                        >
                          {rotuloNicho(p.nicho)}
                        </span>
                        <span>· desde {dataBR(p.criado_em)}</span>
                      </div>
                    </div>

                    {/* valor mensal (editável) */}
                    <label className="flex items-center gap-1.5 text-sm text-[#9b96b0]">
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
                        className="w-24 rounded-lg border border-[#2d2a3e] bg-[#15131f] px-2.5 py-1.5 text-sm text-white"
                      />
                      /mês
                    </label>

                    {/* status + ações */}
                    <div className="flex items-center gap-2">
                      <span
                        className="rounded-full px-2.5 py-1 text-xs font-bold"
                        style={{
                          background: inadimplente
                            ? "rgba(251,113,133,0.18)"
                            : "rgba(79,70,229,0.22)",
                          color: inadimplente ? "#fb7185" : "#a78bfa",
                        }}
                      >
                        {p.plano}
                      </span>
                      <button
                        onClick={() =>
                          mudarPlano(
                            p.id,
                            inadimplente ? "ativo" : "inadimplente",
                          )
                        }
                        disabled={ocupado}
                        className="rounded-[7px] px-3 py-1.5 text-[13px] font-medium disabled:opacity-50"
                        style={
                          inadimplente
                            ? { background: "#4f46e5", color: "#fff" }
                            : {
                                border: "1px solid #fb7185",
                                color: "#fb7185",
                              }
                        }
                      >
                        {inadimplente ? "Reativar" : "Suspender"}
                      </button>
                      <button
                        onClick={() => remover(p.id, p.nome)}
                        disabled={ocupado}
                        className="rounded-[7px] px-3 py-1.5 text-[13px] font-medium text-white disabled:opacity-50"
                        style={{ background: "#fb7185" }}
                      >
                        Remover
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <p className="mt-4 text-center text-[13px] text-[#7c7791]">
          Suspender = profissional inadimplente: some do link público e da lista
          de agendamento até regularizar.
        </p>
      </main>
    </div>
  );
}
