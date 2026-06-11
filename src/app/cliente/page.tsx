"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { coresDoNicho, NICHOS, type Nicho } from "@/lib/nichos";

type Profissional = { id: string; nome: string; nicho: string };
type Servico = { id: string; nome: string; duracao_min: number };
type Janela = { dia_semana: number; hora_inicio: string; hora_fim: string };
type Agendamento = {
  id: string;
  profissional_id: string;
  prof_nome: string;
  prof_nicho: string;
  cliente_nome: string;
  servico: string;
  data: string;
  hora: string;
  status: "confirmado" | "cancelado";
};

const PASSO_MIN = 30;

function paraMinutos(hhmmss: string): number {
  const [h, m] = hhmmss.split(":").map(Number);
  return h * 60 + m;
}
function paraHora(min: number): string {
  const h = String(Math.floor(min / 60)).padStart(2, "0");
  const m = String(min % 60).padStart(2, "0");
  return `${h}:${m}:00`;
}
function bonito(hhmmss: string): string {
  return hhmmss.slice(0, 5);
}
function rotuloNicho(nicho: string): string {
  return NICHOS[nicho as Nicho]?.rotulo ?? nicho;
}

function Cabecalho({
  fundoEscuro = "#1a1a1a",
  modoEscuro,
  onToggle,
}: {
  fundoEscuro?: string;
  modoEscuro: boolean;
  onToggle: () => void;
}) {
  return (
    <header className="text-[#f4f1ea]" style={{ background: fundoEscuro }}>
      <div className="mx-auto flex max-w-[1000px] items-center justify-between gap-2.5 px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <span
            className="flex h-[30px] w-[30px] items-center justify-center rounded-lg font-display font-bold text-white"
            style={{ background: "linear-gradient(135deg,#22d3ee,#a855f7)" }}
          >
            S
          </span>
          <span className="font-display text-[19px] font-semibold">AgendaSonay</span>
        </div>
        <button
          onClick={onToggle}
          title={modoEscuro ? "Modo claro" : "Modo escuro"}
          className="rounded-[9px] border border-white/20 px-3 py-1.5 text-base transition hover:bg-white/10"
        >
          {modoEscuro ? "☀️" : "🌙"}
        </button>
      </div>
    </header>
  );
}

function ClienteAgendamento() {
  const searchParams = useSearchParams();
  const profId = searchParams.get("id") ?? "";
  const token = searchParams.get("token") ?? "";

  const [carregando, setCarregando] = useState(true);
  const [erroCarga, setErroCarga] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const [prof, setProf] = useState<Profissional | null>(null);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [janelas, setJanelas] = useState<Janela[]>([]);
  const [ocupados, setOcupados] = useState<string[]>([]);
  const [refresh, setRefresh] = useState(0);

  const hoje = useMemo(() => new Date().toLocaleDateString("en-CA"), []);
  const [data, setData] = useState(hoje);
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [servico, setServico] = useState("");
  const [hora, setHora] = useState("");
  const [enviando, setEnviando] = useState(false);

  const [agToken, setAgToken] = useState<Agendamento | null>(null);
  const [tokenCarregando, setTokenCarregando] = useState(false);
  const [tokenErro, setTokenErro] = useState<string | null>(null);
  const [remarcando, setRemarcando] = useState(false);
  const [remData, setRemData] = useState("");
  const [remHora, setRemHora] = useState("");
  const [remOcupados, setRemOcupados] = useState<string[]>([]);
  const [remEnviando, setRemEnviando] = useState(false);
  const [remErro, setRemErro] = useState<string | null>(null);
  const [cancelando, setCancelando] = useState(false);
  const [cancelErro, setCancelErro] = useState<string | null>(null);

  const [modoEscuro, setModoEscuro] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("sonay-modo-escuro");
    if (saved === "true") setModoEscuro(true);
  }, []);
  useEffect(() => {
    localStorage.setItem("sonay-modo-escuro", String(modoEscuro));
  }, [modoEscuro]);

  const toggle = () => setModoEscuro((v) => !v);

  // ---------- Cores do nicho (modo normal) ----------
  const { fundoEscuro, cardEscuro, destaque, fundoClaro, forte } = coresDoNicho(prof?.nicho ?? "");

  const tema = useMemo(() => modoEscuro ? {
    pageBg: fundoEscuro,
    cardBg: cardEscuro,
    cardBorder: "rgba(255,255,255,0.1)",
    inputBg: "rgba(255,255,255,0.06)",
    inputBorder: "rgba(255,255,255,0.15)",
    texto: "#f4f1ea",
    textoSec: "rgba(244,241,234,0.6)",
    textoMuto: "rgba(244,241,234,0.4)",
    separador: "rgba(255,255,255,0.08)",
    slotBg: "rgba(255,255,255,0.08)",
    slotOcupBg: "rgba(255,255,255,0.03)",
    slotOcupColor: "rgba(244,241,234,0.25)",
  } : {
    pageBg: fundoClaro,
    cardBg: "#ffffff",
    cardBorder: "#e6e0d4",
    inputBg: "#fafaf7",
    inputBorder: "#e6e0d4",
    texto: "#1a1a1a",
    textoSec: "#777",
    textoMuto: "#999",
    separador: "#f0ece2",
    slotBg: "#fff",
    slotOcupBg: "#f0ece2",
    slotOcupColor: "#ccc",
  }, [modoEscuro, fundoEscuro, cardEscuro, fundoClaro]);

  // ---------- Carregar o negocio do link ----------
  useEffect(() => {
    if (!profId || token) return;
    (async () => {
      const { data: ativos, error } = await supabase.rpc("profissionais_ativos");
      if (error) {
        setErroCarga("Não foi possível carregar agora. Tente novamente.");
        setCarregando(false);
        return;
      }
      const p = ((ativos as Profissional[]) ?? []).find((x) => x.id === profId);
      if (!p) {
        setErroCarga("Link inválido ou negócio indisponível no momento. Peça um novo link ao seu profissional.");
        setCarregando(false);
        return;
      }
      setProf(p);
      const [srv, jan] = await Promise.all([
        supabase.rpc("servicos_publico", { p_profissional_id: profId }),
        supabase.rpc("horarios_publico", { p_profissional_id: profId }),
      ]);
      if (!srv.error) {
        const lista = (srv.data as Servico[]) ?? [];
        setServicos(lista);
        setServico(lista[0]?.nome ?? "");
      }
      if (!jan.error) setJanelas((jan.data as Janela[]) ?? []);
      setCarregando(false);
    })();
  }, [profId, token]);

  useEffect(() => {
    if (!profId || !data || token) return;
    (async () => {
      const { data: occ, error } = await supabase.rpc("horarios_ocupados", {
        p_profissional_id: profId,
        p_data: data,
      });
      if (!error) setOcupados(((occ as { hora: string }[]) ?? []).map((o) => o.hora));
    })();
  }, [profId, data, refresh, token]);

  useEffect(() => {
    if (!token) return;
    setTokenCarregando(true);
    (async () => {
      const { data: rows, error } = await supabase.rpc("agendamento_publico", { p_token: token });
      if (error || !rows || (rows as Agendamento[]).length === 0) {
        setTokenErro("Agendamento não encontrado. Verifique se o link está correto.");
        setTokenCarregando(false);
        return;
      }
      const ag = (rows as Agendamento[])[0];
      setAgToken(ag);
      const { data: jans } = await supabase.rpc("horarios_publico", { p_profissional_id: ag.profissional_id });
      if (jans) setJanelas((jans as Janela[]) ?? []);
      setTokenCarregando(false);
    })();
  }, [token]);

  useEffect(() => {
    if (!remarcando || !agToken || !remData) return;
    (async () => {
      const { data: occ } = await supabase.rpc("horarios_ocupados", {
        p_profissional_id: agToken.profissional_id,
        p_data: remData,
      });
      setRemOcupados(((occ as { hora: string }[]) ?? []).map((o) => o.hora));
    })();
  }, [remarcando, agToken, remData]);

  const grade = useMemo(() => {
    if (!data) return [] as { hora: string; ocupado: boolean }[];
    const diaSemana = new Date(`${data}T00:00:00`).getDay();
    const ocupadosSet = new Set(ocupados);
    const slots: { hora: string; ocupado: boolean }[] = [];
    for (const j of janelas) {
      if (j.dia_semana !== diaSemana) continue;
      const ini = paraMinutos(j.hora_inicio);
      const fim = paraMinutos(j.hora_fim);
      for (let m = ini; m + PASSO_MIN <= fim; m += PASSO_MIN) {
        const slot = paraHora(m);
        slots.push({ hora: slot, ocupado: ocupadosSet.has(slot) });
      }
    }
    return slots;
  }, [data, janelas, ocupados]);

  const remGrade = useMemo(() => {
    if (!remarcando || !remData) return [] as { hora: string; ocupado: boolean }[];
    const diaSemana = new Date(`${remData}T00:00:00`).getDay();
    const ocupadosSet = new Set(remOcupados);
    const slots: { hora: string; ocupado: boolean }[] = [];
    for (const j of janelas) {
      if (j.dia_semana !== diaSemana) continue;
      const ini = paraMinutos(j.hora_inicio);
      const fim = paraMinutos(j.hora_fim);
      for (let m = ini; m + PASSO_MIN <= fim; m += PASSO_MIN) {
        const slot = paraHora(m);
        slots.push({ hora: slot, ocupado: ocupadosSet.has(slot) });
      }
    }
    return slots;
  }, [remarcando, remData, janelas, remOcupados]);

  const rotuloData = useMemo(() => {
    const d = new Date(`${data}T00:00:00`).toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "2-digit",
      month: "2-digit",
    });
    return d.charAt(0).toUpperCase() + d.slice(1);
  }, [data]);

  const podeConfirmar =
    !!servico && !!hora && nome.trim().length > 1 && telefone.trim().length > 7;

  async function agendar() {
    if (!prof || !podeConfirmar) return;
    setErro(null); setEnviando(true);
    const { error } = await supabase.rpc("agendar", {
      p_profissional_id: prof.id,
      p_servico: servico,
      p_data: data,
      p_hora: hora,
      p_cliente_nome: nome,
      p_cliente_telefone: telefone,
    });
    setEnviando(false);
    if (error) { setErro(error.message); setRefresh((r) => r + 1); return; }
    setOk(true);
  }

  async function cancelarAgendamento() {
    if (!agToken) return;
    setCancelando(true); setCancelErro(null);
    const { error } = await supabase.rpc("cancelar_agendamento", { p_id: agToken.id, p_token: token });
    setCancelando(false);
    if (error) { setCancelErro(error.message); return; }
    setAgToken({ ...agToken, status: "cancelado" });
  }

  async function confirmarRemarcar() {
    if (!agToken || !remData || !remHora) return;
    setRemEnviando(true); setRemErro(null);
    const { error } = await supabase.rpc("remarcar_agendamento", {
      p_id: agToken.id,
      p_token: token,
      p_nova_data: remData,
      p_nova_hora: remHora,
    });
    setRemEnviando(false);
    if (error) { setRemErro(error.message); return; }
    setAgToken({ ...agToken, data: remData, hora: remHora });
    setRemarcando(false); setRemData(""); setRemHora("");
  }

  // =====================================================================
  if (!profId && !token) {
    return (
      <div className="min-h-screen" style={{ background: modoEscuro ? "#1a1a1a" : "#f4f1ea" }}>
        <Cabecalho modoEscuro={modoEscuro} onToggle={toggle} />
        <main className="mx-auto flex w-full max-w-[460px] flex-1 flex-col items-center px-5 py-16 text-center">
          <div className="text-[44px]">📅</div>
          <h1 className="mt-3 font-display text-[24px] font-semibold" style={{ color: modoEscuro ? "#f4f1ea" : "#1a1a1a" }}>
            Agendamento AgendaSonay
          </h1>
          <p className="mt-2 leading-relaxed" style={{ color: modoEscuro ? "rgba(244,241,234,0.6)" : "#666" }}>
            Para marcar um horário, abra o <b>link de agendamento</b> que o seu profissional enviou.
          </p>
        </main>
      </div>
    );
  }

  // =====================================================================
  // Modo token
  if (token) {
    if (tokenCarregando) {
      return (
        <>
          <Cabecalho modoEscuro={modoEscuro} onToggle={toggle} />
          <main className="mx-auto w-full max-w-[460px] px-5 py-16 text-center text-[#999]">
            Carregando...
          </main>
        </>
      );
    }
    if (tokenErro) {
      return (
        <>
          <Cabecalho modoEscuro={modoEscuro} onToggle={toggle} />
          <main className="mx-auto flex w-full max-w-[460px] flex-col items-center px-5 py-16 text-center">
            <div className="text-[44px]">🔌</div>
            <h1 className="mt-3 font-display text-[22px] font-semibold">Não foi possível abrir</h1>
            <p className="mt-2 leading-relaxed text-[#666]">{tokenErro}</p>
          </main>
        </>
      );
    }
    if (!agToken) {
      return (
        <>
          <Cabecalho modoEscuro={modoEscuro} onToggle={toggle} />
          <main className="mx-auto w-full max-w-[460px] px-5 py-16 text-center text-[#999]">
            Carregando...
          </main>
        </>
      );
    }

    const { fundoEscuro: fundoToken, cardEscuro: cardToken, destaque: destaqueToken, fundoClaro: fundoClaroToken, forte: forteToken } = coresDoNicho(agToken.prof_nicho);
    const temaToken = modoEscuro ? {
      pageBg: fundoToken,
      cardBg: cardToken,
      cardBorder: "rgba(255,255,255,0.1)",
      inputBg: "rgba(255,255,255,0.06)",
      inputBorder: "rgba(255,255,255,0.15)",
      texto: "#f4f1ea",
      textoSec: "rgba(244,241,234,0.6)",
      textoMuto: "rgba(244,241,234,0.4)",
      separador: "rgba(255,255,255,0.08)",
      slotBg: "rgba(255,255,255,0.08)",
      slotOcupBg: "rgba(255,255,255,0.03)",
      slotOcupColor: "rgba(244,241,234,0.25)",
    } : {
      pageBg: fundoClaroToken,
      cardBg: "#ffffff",
      cardBorder: "#e6e0d4",
      inputBg: "#fafaf7",
      inputBorder: "#e6e0d4",
      texto: "#1a1a1a",
      textoSec: "#777",
      textoMuto: "#999",
      separador: "#f0ece2",
      slotBg: "#fff",
      slotOcupBg: "#f0ece2",
      slotOcupColor: "#ccc",
    };

    const confirmado = agToken.status === "confirmado";
    const dataFormatada = new Date(`${agToken.data}T00:00:00`).toLocaleDateString("pt-BR", {
      weekday: "long", day: "2-digit", month: "2-digit", year: "numeric",
    });

    return (
      <div className="min-h-screen" style={{ background: temaToken.pageBg, color: temaToken.texto }}>
        <Cabecalho fundoEscuro={fundoToken} modoEscuro={modoEscuro} onToggle={toggle} />
        <main className="mx-auto w-full max-w-[1000px] flex-1 px-5 py-7">
          <div className="card-fade mx-auto max-w-[460px]">
            <p className="mb-5 text-center text-[13px] uppercase tracking-wider" style={{ color: temaToken.textoMuto }}>
              Seu agendamento
            </p>
            <div className="rounded-[14px] p-7" style={{ background: temaToken.cardBg, border: `1px solid ${temaToken.cardBorder}` }}>
              <div className="text-center">
                <h2 className="font-display text-[22px] font-semibold">{agToken.prof_nome}</h2>
                <div
                  className="mt-1.5 inline-block rounded-full px-2.5 py-1 text-xs font-bold"
                  style={{ background: destaqueToken + "22", color: destaqueToken }}
                >
                  {rotuloNicho(agToken.prof_nicho)}
                </div>
              </div>

              <div className="mt-5 flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: confirmado ? "#22c55e" : "#9ca3af" }} />
                <span className="text-sm font-medium" style={{ color: confirmado ? "#15803d" : "#6b7280" }}>
                  {confirmado ? "Confirmado" : "Cancelado"}
                </span>
              </div>

              <div
                className="mt-4 space-y-2 rounded-[10px] px-4 py-3.5 text-sm"
                style={{ background: temaToken.inputBg, border: `1px solid ${temaToken.inputBorder}` }}
              >
                {[
                  { label: "Serviço", valor: agToken.servico },
                  { label: "Data", valor: <span className="capitalize">{dataFormatada}</span> },
                  { label: "Horário", valor: bonito(agToken.hora) },
                  { label: "Cliente", valor: agToken.cliente_nome },
                ].map(({ label, valor }) => (
                  <div key={label} className="flex justify-between">
                    <span style={{ color: temaToken.textoSec }}>{label}</span>
                    <span className="font-medium">{valor}</span>
                  </div>
                ))}
              </div>

              {cancelErro && (
                <div className="mt-3 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">{cancelErro}</div>
              )}

              {confirmado && !remarcando && (
                <div className="mt-5 flex flex-col gap-2">
                  <button
                    onClick={() => { setRemarcando(true); setRemData(hoje); setRemHora(""); setRemErro(null); }}
                    className="w-full rounded-[10px] py-3 text-[15px] font-bold text-white"
                    style={{ background: forteToken }}
                  >
                    Remarcar horário
                  </button>
                  <button
                    onClick={cancelarAgendamento}
                    disabled={cancelando}
                    className="w-full rounded-[10px] py-3 text-[15px] font-medium text-[#e53e3e]"
                    style={{ border: `1px solid ${temaToken.cardBorder}`, cursor: cancelando ? "not-allowed" : "pointer" }}
                  >
                    {cancelando ? "Cancelando..." : "Cancelar horário"}
                  </button>
                </div>
              )}

              {confirmado && remarcando && (
                <div className="mt-5">
                  <p className="mb-3 text-sm font-medium" style={{ color: temaToken.textoSec }}>
                    Escolha o novo horário
                  </p>
                  {remErro && (
                    <div className="mb-3 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">{remErro}</div>
                  )}
                  <label className="mb-1.5 block text-[13px] font-medium" style={{ color: temaToken.textoSec }}>Dia</label>
                  <input
                    type="date"
                    min={hoje}
                    value={remData}
                    onChange={(e) => { setRemData(e.target.value); setRemHora(""); }}
                    className="w-full rounded-[9px] px-3.5 py-2.5 text-sm"
                    style={{ background: temaToken.inputBg, border: `1px solid ${temaToken.inputBorder}`, color: temaToken.texto }}
                  />
                  {remData && (
                    <>
                      <label className="mb-1.5 mt-4 block text-[13px] font-medium" style={{ color: temaToken.textoSec }}>
                        Horário disponível
                      </label>
                      {remGrade.length === 0 ? (
                        <p className="mb-3 text-sm" style={{ color: temaToken.textoMuto }}>
                          Sem atendimento neste dia. Escolha outra data.
                        </p>
                      ) : (
                        <div className="mb-3 grid grid-cols-4 gap-2">
                          {remGrade.map(({ hora: h, ocupado }) => {
                            const sel = remHora === h;
                            return (
                              <button
                                key={h}
                                disabled={ocupado}
                                onClick={() => setRemHora(h)}
                                className="rounded-lg border py-2.5 text-sm font-medium"
                                style={{
                                  background: sel ? forteToken : ocupado ? temaToken.slotOcupBg : temaToken.slotBg,
                                  color: sel ? "#fff" : ocupado ? temaToken.slotOcupColor : temaToken.texto,
                                  borderColor: sel ? forteToken : temaToken.cardBorder,
                                  textDecoration: ocupado ? "line-through" : "none",
                                  cursor: ocupado ? "not-allowed" : "pointer",
                                }}
                              >
                                {bonito(h)}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </>
                  )}
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={confirmarRemarcar}
                      disabled={!remData || !remHora || remEnviando}
                      className="flex-1 rounded-[10px] py-3 text-[15px] font-bold text-white"
                      style={{ background: !remData || !remHora || remEnviando ? "#ddd" : "#1a1a1a", cursor: !remData || !remHora || remEnviando ? "not-allowed" : "pointer" }}
                    >
                      {remEnviando ? "Remarcando..." : "Confirmar"}
                    </button>
                    <button
                      onClick={() => { setRemarcando(false); setRemData(""); setRemHora(""); setRemErro(null); }}
                      className="rounded-[10px] px-5 py-3 text-sm font-medium"
                      style={{ border: `1px solid ${temaToken.cardBorder}`, color: temaToken.textoSec }}
                    >
                      Voltar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    );
  }

  // =====================================================================
  if (carregando) {
    return (
      <>
        <Cabecalho modoEscuro={modoEscuro} onToggle={toggle} />
        <main className="mx-auto w-full max-w-[460px] px-5 py-16 text-center text-[#999]">
          Carregando...
        </main>
      </>
    );
  }

  if (erroCarga) {
    return (
      <>
        <Cabecalho modoEscuro={modoEscuro} onToggle={toggle} />
        <main className="mx-auto flex w-full max-w-[460px] flex-col items-center px-5 py-16 text-center">
          <div className="text-[44px]">🔌</div>
          <h1 className="mt-3 font-display text-[22px] font-semibold">Não foi possível abrir</h1>
          <p className="mt-2 leading-relaxed text-[#666]">{erroCarga}</p>
        </main>
      </>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: tema.pageBg, color: tema.texto }}>
      <Cabecalho fundoEscuro={fundoEscuro} modoEscuro={modoEscuro} onToggle={toggle} />
      <main className="mx-auto w-full max-w-[1000px] flex-1 px-5 py-7">
        {erro && (
          <div className="mx-auto mb-5 max-w-[460px] rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
            {erro}
          </div>
        )}

        {ok ? (
          <div
            className="card-fade mx-auto mt-10 max-w-[440px] rounded-[14px] p-10 text-center"
            style={{ background: tema.cardBg, border: `1px solid ${tema.cardBorder}` }}
          >
            <div className="text-[44px]">✅</div>
            <h2 className="mt-3 font-display text-[26px] font-semibold">Agendamento confirmado!</h2>
            <p className="mt-1.5 leading-relaxed" style={{ color: tema.textoSec }}>
              {nome}, seu horário em <b>{prof?.nome}</b> para <b>{servico}</b> às{" "}
              <b>{bonito(hora)}</b> ({rotuloData}) está reservado. Você receberá um lembrete no WhatsApp 1 dia antes.
            </p>
            <button
              onClick={() => { setOk(false); setNome(""); setTelefone(""); setHora(""); setRefresh((r) => r + 1); }}
              className="mt-5 rounded-[9px] bg-[#1a1a1a] px-5 py-2.5 font-medium text-white"
            >
              Novo agendamento
            </button>
          </div>
        ) : (
          <div className="card-fade">
            <p className="mb-5 text-center text-[13px] uppercase tracking-wider" style={{ color: tema.textoMuto }}>
              Marque seu horário
            </p>
            <div
              className="mx-auto max-w-[460px] rounded-[14px] p-7"
              style={{ background: tema.cardBg, border: `1px solid ${tema.cardBorder}` }}
            >
              <div className="text-center">
                <h2 className="font-display text-[22px] font-semibold">{prof?.nome}</h2>
                <div
                  className="mt-1.5 inline-block rounded-full px-2.5 py-1 text-xs font-bold"
                  style={{ background: destaque + "22", color: destaque }}
                >
                  {prof ? rotuloNicho(prof.nicho) : ""}
                </div>
              </div>

              <label className="mb-1.5 mt-5 block text-[13px] font-medium" style={{ color: tema.textoSec }}>
                Seu nome
              </label>
              <input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Como você se chama?"
                className="w-full rounded-[9px] px-3.5 py-2.5 text-sm"
                style={{ background: tema.inputBg, border: `1px solid ${tema.inputBorder}`, color: tema.texto }}
              />

              <label className="mb-1.5 mt-4 block text-[13px] font-medium" style={{ color: tema.textoSec }}>
                Telefone
              </label>
              <input
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                placeholder="(11) 99999-9999"
                inputMode="tel"
                className="w-full rounded-[9px] px-3.5 py-2.5 text-sm"
                style={{ background: tema.inputBg, border: `1px solid ${tema.inputBorder}`, color: tema.texto }}
              />

              <label className="mb-1.5 mt-4 block text-[13px] font-medium" style={{ color: tema.textoSec }}>
                Serviço
              </label>
              {servicos.length === 0 ? (
                <p className="text-sm" style={{ color: tema.textoMuto }}>
                  Este negócio ainda não cadastrou serviços.
                </p>
              ) : (
                <select
                  value={servico}
                  onChange={(e) => setServico(e.target.value)}
                  className="w-full rounded-[9px] px-3.5 py-2.5 text-sm"
                  style={{ background: tema.inputBg, border: `1px solid ${tema.inputBorder}`, color: tema.texto }}
                >
                  {servicos.map((s) => (
                    <option key={s.id} value={s.nome}>{s.nome} ({s.duracao_min} min)</option>
                  ))}
                </select>
              )}

              <label className="mb-1.5 mt-4 block text-[13px] font-medium" style={{ color: tema.textoSec }}>
                Dia
              </label>
              <input
                type="date"
                min={hoje}
                value={data}
                onChange={(e) => { setData(e.target.value); setHora(""); }}
                className="w-full rounded-[9px] px-3.5 py-2.5 text-sm"
                style={{ background: tema.inputBg, border: `1px solid ${tema.inputBorder}`, color: tema.texto }}
              />

              <label className="mb-1.5 mt-4 block text-[13px] font-medium" style={{ color: tema.textoSec }}>
                Horário disponível — {rotuloData}
              </label>
              {grade.length === 0 ? (
                <p className="mb-5 text-sm" style={{ color: tema.textoMuto }}>
                  Sem atendimento neste dia. Escolha outra data.
                </p>
              ) : (
                <div className="mb-5 grid grid-cols-4 gap-2">
                  {grade.map(({ hora: h, ocupado }) => {
                    const sel = hora === h;
                    return (
                      <button
                        key={h}
                        disabled={ocupado}
                        onClick={() => setHora(h)}
                        className="rounded-lg border py-2.5 text-sm font-medium"
                        style={{
                          background: sel ? forte : ocupado ? tema.slotOcupBg : tema.slotBg,
                          color: sel ? "#fff" : ocupado ? tema.slotOcupColor : tema.texto,
                          borderColor: sel ? forte : tema.cardBorder,
                          textDecoration: ocupado ? "line-through" : "none",
                          cursor: ocupado ? "not-allowed" : "pointer",
                        }}
                      >
                        {bonito(h)}
                      </button>
                    );
                  })}
                </div>
              )}

              <button
                onClick={agendar}
                disabled={!podeConfirmar || enviando}
                className="w-full rounded-[10px] py-3.5 text-[15px] font-bold text-white"
                style={{
                  background: !podeConfirmar || enviando ? "#ddd" : "#1a1a1a",
                  cursor: !podeConfirmar || enviando ? "not-allowed" : "pointer",
                }}
              >
                {enviando ? "Confirmando..." : "Confirmar agendamento"}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function ClientePage() {
  return (
    <Suspense
      fallback={
        <>
          <header className="bg-[#1a1a1a] text-[#f4f1ea]">
            <div className="mx-auto flex max-w-[1000px] items-center px-5 py-3.5 gap-2.5">
              <span className="flex h-[30px] w-[30px] items-center justify-center rounded-lg font-display font-bold text-white" style={{ background: "linear-gradient(135deg,#22d3ee,#a855f7)" }}>S</span>
              <span className="font-display text-[19px] font-semibold">AgendaSonay</span>
            </div>
          </header>
          <main className="mx-auto w-full max-w-[460px] px-5 py-16 text-center text-[#999]">
            Carregando...
          </main>
        </>
      }
    >
      <ClienteAgendamento />
    </Suspense>
  );
}
