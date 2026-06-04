"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { corDoNicho, NICHOS, type Nicho } from "@/lib/nichos";

// ---------- Tipos dos retornos das funcoes do banco ----------
type Profissional = { id: string; nome: string; nicho: string };
type Servico = { id: string; nome: string; duracao_min: number };
type Janela = { dia_semana: number; hora_inicio: string; hora_fim: string };

const PASSO_MIN = 30; // grade de horarios de 30 em 30 minutos

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

export default function ClientePage() {
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  // dados do banco
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [profId, setProfId] = useState<string>("");
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [janelas, setJanelas] = useState<Janela[]>([]);
  const [ocupados, setOcupados] = useState<string[]>([]);

  // formulario
  const hoje = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [data, setData] = useState(hoje);
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [servico, setServico] = useState("");
  const [hora, setHora] = useState("");
  const [enviando, setEnviando] = useState(false);

  const prof = profissionais.find((p) => p.id === profId) ?? null;
  const cor = prof ? corDoNicho(prof.nicho) : "#1a1a1a";

  // ---------- 1) Profissionais ativos ----------
  useEffect(() => {
    (async () => {
      const { data: lista, error } = await supabase.rpc("profissionais_ativos");
      if (error) setErro(error.message);
      else {
        const arr = (lista as Profissional[]) ?? [];
        setProfissionais(arr);
        setProfId((atual) => atual || arr[0]?.id || "");
      }
      setCarregando(false);
    })();
  }, []);

  // ---------- 2) Servicos + janelas do profissional escolhido ----------
  useEffect(() => {
    if (!profId) return;
    setServico("");
    setHora("");
    (async () => {
      const [srv, jan] = await Promise.all([
        supabase.rpc("servicos_publico", { p_profissional_id: profId }),
        supabase.rpc("horarios_publico", { p_profissional_id: profId }),
      ]);
      if (srv.error) setErro(srv.error.message);
      else {
        const lista = (srv.data as Servico[]) ?? [];
        setServicos(lista);
        setServico(lista[0]?.nome ?? "");
      }
      if (jan.error) setErro(jan.error.message);
      else setJanelas((jan.data as Janela[]) ?? []);
    })();
  }, [profId]);

  // ---------- 3) Horarios ocupados da data ----------
  const carregarOcupados = useCallback(async () => {
    if (!profId || !data) return;
    const { data: occ, error } = await supabase.rpc("horarios_ocupados", {
      p_profissional_id: profId,
      p_data: data,
    });
    if (error) setErro(error.message);
    else setOcupados(((occ as { hora: string }[]) ?? []).map((o) => o.hora));
  }, [profId, data]);

  useEffect(() => {
    setHora("");
    carregarOcupados();
  }, [carregarOcupados]);

  // ---------- Grade de horarios do dia (livres + ocupados riscados) ----------
  const grade = useMemo(() => {
    if (!data) return [] as { hora: string; ocupado: boolean }[];
    const diaSemana = new Date(`${data}T00:00:00`).getDay(); // 0=domingo
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

  const rotuloData = useMemo(() => {
    const d = new Date(`${data}T00:00:00`).toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "2-digit",
      month: "2-digit",
    });
    return d.charAt(0).toUpperCase() + d.slice(1);
  }, [data]);

  // ---------- 4) Confirmar ----------
  async function agendar() {
    if (!prof || !podeConfirmar) return;
    setErro(null);
    setEnviando(true);
    const { error } = await supabase.rpc("agendar", {
      p_profissional_id: prof.id,
      p_servico: servico,
      p_data: data,
      p_hora: hora,
      p_cliente_nome: nome,
      p_cliente_telefone: telefone,
    });
    setEnviando(false);
    if (error) {
      setErro(error.message);
      return;
    }
    setOk(true);
  }

  const podeConfirmar =
    !!servico && !!hora && nome.trim().length > 1 && telefone.trim().length > 7;

  // estilos de campo (paleta quente do prototipo)
  const campo =
    "w-full rounded-[9px] border border-[#e6e0d4] bg-[#fafaf7] px-3.5 py-2.5 text-sm";

  // =====================================================================
  return (
    <>
      <header className="bg-[#1a1a1a] text-[#f4f1ea]">
        <div className="mx-auto flex max-w-[1000px] items-center gap-2.5 px-5 py-3.5">
          <Link href="/" className="flex items-center gap-2.5">
            <span
              className="flex h-[30px] w-[30px] items-center justify-center rounded-lg font-display font-bold text-white"
              style={{ background: "linear-gradient(135deg,#22d3ee,#a855f7)" }}
            >
              S
            </span>
            <span className="font-display text-[19px] font-semibold">
              AgendaSonay
            </span>
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1000px] flex-1 px-5 py-7">
        {erro && (
          <div className="mx-auto mb-5 max-w-[460px] rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
            {erro}
          </div>
        )}

        {/* -------- SUCESSO -------- */}
        {ok ? (
          <div className="card-fade mx-auto mt-10 max-w-[440px] rounded-[14px] border border-[#e6e0d4] bg-white p-10 text-center">
            <div className="text-[44px]">✅</div>
            <h2 className="mt-3 font-display text-[26px] font-semibold">
              Agendamento confirmado!
            </h2>
            <p className="mt-1.5 leading-relaxed text-[#666]">
              {nome}, seu horário de <b>{servico}</b> às <b>{bonito(hora)}</b>{" "}
              está reservado. Você receberá um lembrete no WhatsApp 1 dia antes.
            </p>
            <button
              onClick={() => {
                setOk(false);
                setNome("");
                setTelefone("");
                setHora("");
                carregarOcupados();
              }}
              className="mt-5 rounded-[9px] bg-[#1a1a1a] px-5 py-2.5 font-medium text-white"
            >
              Novo agendamento
            </button>
          </div>
        ) : (
          /* -------- FORMULARIO -------- */
          <div className="card-fade">
            <p className="mb-5 text-center text-[13px] uppercase tracking-wider text-[#999]">
              Marque seu horário
            </p>

            <div className="mx-auto max-w-[460px] rounded-[14px] border border-[#e6e0d4] bg-white p-7">
              {carregando ? (
                <p className="text-[#999]">Carregando...</p>
              ) : profissionais.length === 0 ? (
                <p className="text-[#999]">
                  Nenhum profissional ativo cadastrado ainda.
                </p>
              ) : (
                <>
                  {/* profissional */}
                  <select
                    value={profId}
                    onChange={(e) => setProfId(e.target.value)}
                    className={campo}
                  >
                    {profissionais.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nome}
                      </option>
                    ))}
                  </select>

                  {prof && (
                    <div
                      className="my-2 inline-block rounded-full px-2.5 py-1 text-xs font-bold"
                      style={{ background: cor + "22", color: cor }}
                    >
                      {rotuloNicho(prof.nicho)}
                    </div>
                  )}

                  {/* nome */}
                  <label className="mb-1.5 mt-3 block text-[13px] font-medium text-[#666]">
                    Seu nome
                  </label>
                  <input
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Como você se chama?"
                    className={campo}
                  />

                  {/* telefone */}
                  <label className="mb-1.5 mt-4 block text-[13px] font-medium text-[#666]">
                    Telefone
                  </label>
                  <input
                    value={telefone}
                    onChange={(e) => setTelefone(e.target.value)}
                    placeholder="(11) 99999-9999"
                    inputMode="tel"
                    className={campo}
                  />

                  {/* servico */}
                  <label className="mb-1.5 mt-4 block text-[13px] font-medium text-[#666]">
                    Serviço
                  </label>
                  <select
                    value={servico}
                    onChange={(e) => setServico(e.target.value)}
                    className={campo}
                  >
                    {servicos.map((s) => (
                      <option key={s.id} value={s.nome}>
                        {s.nome} ({s.duracao_min} min)
                      </option>
                    ))}
                  </select>

                  {/* data */}
                  <label className="mb-1.5 mt-4 block text-[13px] font-medium text-[#666]">
                    Dia
                  </label>
                  <input
                    type="date"
                    min={hoje}
                    value={data}
                    onChange={(e) => setData(e.target.value)}
                    className={campo}
                  />

                  {/* horarios */}
                  <label className="mb-1.5 mt-4 block text-[13px] font-medium text-[#666]">
                    Horário disponível — {rotuloData}
                  </label>
                  {grade.length === 0 ? (
                    <p className="mb-5 text-sm text-[#999]">
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
                              background: sel
                                ? cor
                                : ocupado
                                  ? "#f0ece2"
                                  : "#fff",
                              color: sel ? "#fff" : ocupado ? "#ccc" : "#1a1a1a",
                              borderColor: sel ? cor : "#e6e0d4",
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

                  {/* confirmar */}
                  <button
                    onClick={agendar}
                    disabled={!podeConfirmar || enviando}
                    className="w-full rounded-[10px] py-3.5 text-[15px] font-bold text-white"
                    style={{
                      background: !podeConfirmar || enviando ? "#ddd" : "#1a1a1a",
                      cursor:
                        !podeConfirmar || enviando ? "not-allowed" : "pointer",
                    }}
                  >
                    {enviando ? "Confirmando..." : "Confirmar agendamento"}
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </main>
    </>
  );
}
