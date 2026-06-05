"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { corDoNicho, NICHOS, type Nicho } from "@/lib/nichos";

// ---------- Tipos dos retornos das funcoes publicas do banco ----------
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

// Cabecalho da marca, reutilizado em todos os estados da tela.
function Cabecalho() {
  return (
    <header className="bg-[#1a1a1a] text-[#f4f1ea]">
      <div className="mx-auto flex max-w-[1000px] items-center gap-2.5 px-5 py-3.5">
        <span
          className="flex h-[30px] w-[30px] items-center justify-center rounded-lg font-display font-bold text-white"
          style={{ background: "linear-gradient(135deg,#22d3ee,#a855f7)" }}
        >
          S
        </span>
        <span className="font-display text-[19px] font-semibold">
          AgendaSonay
        </span>
      </div>
    </header>
  );
}

function ClienteAgendamento() {
  const searchParams = useSearchParams();
  const profId = searchParams.get("id") ?? "";

  const [carregando, setCarregando] = useState(true);
  const [erroCarga, setErroCarga] = useState<string | null>(null); // link invalido/inativo
  const [detalhe, setDetalhe] = useState<string | null>(null); // detalhe tecnico p/ debug
  const [erro, setErro] = useState<string | null>(null); // erro ao confirmar
  const [ok, setOk] = useState(false);

  // dados do banco
  const [prof, setProf] = useState<Profissional | null>(null);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [janelas, setJanelas] = useState<Janela[]>([]);
  const [ocupados, setOcupados] = useState<string[]>([]);
  const [refresh, setRefresh] = useState(0); // recarrega ocupados sob demanda

  // formulario
  const hoje = useMemo(() => new Date().toLocaleDateString("en-CA"), []);
  const [data, setData] = useState(hoje);
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [servico, setServico] = useState("");
  const [hora, setHora] = useState("");
  const [enviando, setEnviando] = useState(false);

  const cor = prof ? corDoNicho(prof.nicho) : "#1a1a1a";

  // ---------- Carregar o negocio do link (valida que esta ATIVO) ----------
  useEffect(() => {
    if (!profId) return; // sem id -> tela generica (no render)
    (async () => {
      const { data: ativos, error } = await supabase.rpc("profissionais_ativos");
      if (error) {
        setErroCarga("Não foi possível carregar agora. Tente novamente.");
        setDetalhe(`profissionais_ativos: ${error.message}`);
        setCarregando(false);
        return;
      }
      const p = ((ativos as Profissional[]) ?? []).find((x) => x.id === profId);
      if (!p) {
        setErroCarga(
          "Link inválido ou negócio indisponível no momento. Peça um novo link ao seu profissional.",
        );
        setDetalhe(
          `profissionais_ativos retornou ${((ativos as Profissional[]) ?? []).length} negócio(s) ativo(s); nenhum com id=${profId}`,
        );
        setCarregando(false);
        return;
      }
      setProf(p);

      const [srv, jan] = await Promise.all([
        supabase.rpc("servicos_publico", { p_profissional_id: profId }),
        supabase.rpc("horarios_publico", { p_profissional_id: profId }),
      ]);
      if (srv.error) setDetalhe(`servicos_publico: ${srv.error.message}`);
      else {
        const lista = (srv.data as Servico[]) ?? [];
        setServicos(lista);
        setServico(lista[0]?.nome ?? "");
      }
      if (jan.error) setDetalhe(`horarios_publico: ${jan.error.message}`);
      else setJanelas((jan.data as Janela[]) ?? []);

      setCarregando(false);
    })();
  }, [profId]);

  // ---------- Horarios ja ocupados da data escolhida ----------
  useEffect(() => {
    if (!profId || !data) return;
    (async () => {
      const { data: occ, error } = await supabase.rpc("horarios_ocupados", {
        p_profissional_id: profId,
        p_data: data,
      });
      if (!error) {
        setOcupados(((occ as { hora: string }[]) ?? []).map((o) => o.hora));
      }
    })();
  }, [profId, data, refresh]);

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

  const podeConfirmar =
    !!servico && !!hora && nome.trim().length > 1 && telefone.trim().length > 7;

  // ---------- Confirmar agendamento ----------
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
      setRefresh((r) => r + 1); // pode ter ficado ocupado; recarrega a grade
      return;
    }
    setOk(true);
  }

  const campo =
    "w-full rounded-[9px] border border-[#e6e0d4] bg-[#fafaf7] px-3.5 py-2.5 text-sm";

  // =====================================================================
  // Sem ?id= -> tela generica do AgendaSonay
  if (!profId) {
    return (
      <>
        <Cabecalho />
        <main className="mx-auto flex w-full max-w-[460px] flex-1 flex-col items-center px-5 py-16 text-center">
          <div className="text-[44px]">📅</div>
          <h1 className="mt-3 font-display text-[24px] font-semibold">
            Agendamento AgendaSonay
          </h1>
          <p className="mt-2 leading-relaxed text-[#666]">
            Para marcar um horário, abra o <b>link de agendamento</b> que o seu
            profissional enviou. Ele tem o endereço do negócio dele.
          </p>
        </main>
      </>
    );
  }

  // Carregando
  if (carregando) {
    return (
      <>
        <Cabecalho />
        <main className="mx-auto w-full max-w-[460px] px-5 py-16 text-center text-[#999]">
          Carregando...
        </main>
      </>
    );
  }

  // Link invalido / negocio inativo
  if (erroCarga) {
    return (
      <>
        <Cabecalho />
        <main className="mx-auto flex w-full max-w-[460px] flex-col items-center px-5 py-16 text-center">
          <div className="text-[44px]">🔌</div>
          <h1 className="mt-3 font-display text-[22px] font-semibold">
            Não foi possível abrir
          </h1>
          <p className="mt-2 leading-relaxed text-[#666]">{erroCarga}</p>
          {detalhe && (
            <p className="mt-4 max-w-[460px] break-words rounded-lg bg-[#f0ece2] px-3 py-2 font-mono text-[11px] text-[#888]">
              {detalhe}
            </p>
          )}
        </main>
      </>
    );
  }

  return (
    <>
      <Cabecalho />
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
              {nome}, seu horário em <b>{prof?.nome}</b> para <b>{servico}</b> às{" "}
              <b>{bonito(hora)}</b> ({rotuloData}) está reservado. Você receberá
              um lembrete no WhatsApp 1 dia antes.
            </p>
            <button
              onClick={() => {
                setOk(false);
                setNome("");
                setTelefone("");
                setHora("");
                setRefresh((r) => r + 1);
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
              {/* Negocio (vindo do link, sem dropdown) */}
              <div className="text-center">
                <h2 className="font-display text-[22px] font-semibold">
                  {prof?.nome}
                </h2>
                <div
                  className="mt-1.5 inline-block rounded-full px-2.5 py-1 text-xs font-bold"
                  style={{ background: cor + "22", color: cor }}
                >
                  {prof ? rotuloNicho(prof.nicho) : ""}
                </div>
              </div>

              {/* nome */}
              <label className="mb-1.5 mt-5 block text-[13px] font-medium text-[#666]">
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
              {servicos.length === 0 ? (
                <p className="text-sm text-[#999]">
                  Este negócio ainda não cadastrou serviços.
                </p>
              ) : (
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
              )}

              {/* data */}
              <label className="mb-1.5 mt-4 block text-[13px] font-medium text-[#666]">
                Dia
              </label>
              <input
                type="date"
                min={hoje}
                value={data}
                onChange={(e) => {
                  setData(e.target.value);
                  setHora("");
                }}
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
                          background: sel ? cor : ocupado ? "#f0ece2" : "#fff",
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
                  cursor: !podeConfirmar || enviando ? "not-allowed" : "pointer",
                }}
              >
                {enviando ? "Confirmando..." : "Confirmar agendamento"}
              </button>
            </div>
          </div>
        )}
      </main>
    </>
  );
}

export default function ClientePage() {
  return (
    <Suspense
      fallback={
        <>
          <Cabecalho />
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
