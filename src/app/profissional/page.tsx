"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { corDoNicho, NICHOS, type Nicho } from "@/lib/nichos";

// ---------- Tipos das tabelas (RLS garante: só os próprios dados) ----------
type Profissional = { id: string; nome: string; nicho: string };
type Agendamento = {
  id: string;
  cliente_nome: string;
  cliente_telefone: string;
  servico: string;
  data: string; // YYYY-MM-DD
  hora: string; // HH:MM:SS
  status: "confirmado" | "cancelado";
};
type LinhaHorario = {
  dia_semana: number;
  hora_inicio: string;
  hora_fim: string;
};
type Servico = { id: string; nome: string; duracao_min: number };

const DIAS = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];

// Estado editável de uma janela de atendimento (1 faixa por dia, no MVP).
type DiaConfig = { ativo: boolean; inicio: string; fim: string };
const HORARIO_PADRAO: DiaConfig = {
  ativo: false,
  inicio: "09:00",
  fim: "18:00",
};

const PASSO_MIN = 30; // grade de horarios de 30 em 30 minutos (igual a tela do cliente)

// ---------- helpers ----------
const hhmm = (t: string) => t.slice(0, 5);
const hojeISO = () => new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD local
function paraMinutos(hhmmss: string): number {
  const [h, m] = hhmmss.split(":").map(Number);
  return h * 60 + m;
}
function paraHora(min: number): string {
  const h = String(Math.floor(min / 60)).padStart(2, "0");
  const m = String(min % 60).padStart(2, "0");
  return `${h}:${m}:00`;
}
function addDias(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + n);
  return d.toLocaleDateString("en-CA");
}
function dataPorExtenso(iso: string): string {
  const d = new Date(`${iso}T00:00:00`).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });
  return d.charAt(0).toUpperCase() + d.slice(1);
}

export default function ProfissionalPage() {
  const router = useRouter();
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [prof, setProf] = useState<Profissional | null>(null);
  const [semPerfil, setSemPerfil] = useState(false);

  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [cancelandoId, setCancelandoId] = useState<string | null>(null);

  const [servicos, setServicos] = useState<Servico[]>([]);
  const [novoNome, setNovoNome] = useState("");
  const [novaDuracao, setNovaDuracao] = useState(30);
  const [salvandoServico, setSalvandoServico] = useState(false);
  const [removendoServicoId, setRemovendoServicoId] = useState<string | null>(
    null,
  );
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editNome, setEditNome] = useState("");
  const [editDuracao, setEditDuracao] = useState(30);
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);

  const [dias, setDias] = useState<DiaConfig[]>(
    DIAS.map(() => ({ ...HORARIO_PADRAO })),
  );
  const [salvandoHorarios, setSalvandoHorarios] = useState(false);
  const [horariosOk, setHorariosOk] = useState(false);

  const [copiado, setCopiado] = useState(false);

  // ---------- Agendar para cliente (modal) ----------
  const [modalAberto, setModalAberto] = useState(false);
  const [agNome, setAgNome] = useState("");
  const [agTelefone, setAgTelefone] = useState("");
  const [agServico, setAgServico] = useState("");
  const [agData, setAgData] = useState(hojeISO());
  const [agHora, setAgHora] = useState("");
  const [agOcupados, setAgOcupados] = useState<string[]>([]);
  const [agEnviando, setAgEnviando] = useState(false);
  const [agErro, setAgErro] = useState<string | null>(null);
  const [agLink, setAgLink] = useState<string | null>(null);
  const [agLinkCopiado, setAgLinkCopiado] = useState(false);

  const cor = prof ? corDoNicho(prof.nicho) : "#1a1a1a";
  const rotuloNicho = prof
    ? (NICHOS[prof.nicho as Nicho]?.rotulo ?? prof.nicho)
    : "";

  // ---------- Carregar dados do profissional logado ----------
  useEffect(() => {
    // IIFE: os setState ocorrem só depois do await (nao sincronos no efeito).
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/");
        return;
      }

      // Perfil (RLS: profissional_le_proprio)
      const { data: p, error: erroProf } = await supabase
        .from("profissionais")
        .select("id, nome, nicho")
        .eq("id", user.id)
        .maybeSingle();
      if (erroProf) {
        setErro(erroProf.message);
        setCarregando(false);
        return;
      }
      if (!p) {
        setSemPerfil(true);
        setCarregando(false);
        return;
      }
      setProf(p as Profissional);

      // Agendamentos + horários + serviços (RLS já filtra para os próprios)
      const [ags, hrs, srv] = await Promise.all([
        supabase
          .from("agendamentos")
          .select(
            "id, cliente_nome, cliente_telefone, servico, data, hora, status",
          )
          .order("data", { ascending: true })
          .order("hora", { ascending: true }),
        supabase
          .from("horarios_disponiveis")
          .select("dia_semana, hora_inicio, hora_fim"),
        supabase
          .from("servicos")
          .select("id, nome, duracao_min")
          .order("nome", { ascending: true }),
      ]);

      if (ags.error) setErro(ags.error.message);
      else setAgendamentos((ags.data as Agendamento[]) ?? []);

      if (!srv.error) setServicos((srv.data as Servico[]) ?? []);

      if (!hrs.error && hrs.data) {
        const base = DIAS.map(() => ({ ...HORARIO_PADRAO }));
        for (const h of hrs.data as LinhaHorario[]) {
          if (h.dia_semana >= 0 && h.dia_semana <= 6) {
            base[h.dia_semana] = {
              ativo: true,
              inicio: hhmm(h.hora_inicio),
              fim: hhmm(h.hora_fim),
            };
          }
        }
        setDias(base);
      }

      setCarregando(false);
    })();
  }, [router]);

  // ---------- Resumo (só confirmados) ----------
  const resumo = useMemo(() => {
    const hoje = hojeISO();
    const dow = new Date(`${hoje}T00:00:00`).getDay();
    const inicioSemana = addDias(hoje, -dow);
    const fimSemana = addDias(inicioSemana, 6);
    const confirmados = agendamentos.filter((a) => a.status === "confirmado");
    return {
      hoje: confirmados.filter((a) => a.data === hoje).length,
      semana: confirmados.filter(
        (a) => a.data >= inicioSemana && a.data <= fimSemana,
      ).length,
      total: confirmados.length,
    };
  }, [agendamentos]);

  // ---------- Agenda agrupada por dia ----------
  const porDia = useMemo(() => {
    const grupos = new Map<string, Agendamento[]>();
    for (const a of agendamentos) {
      const lista = grupos.get(a.data) ?? [];
      lista.push(a);
      grupos.set(a.data, lista);
    }
    return [...grupos.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [agendamentos]);

  // ---------- Horarios ja ocupados na data escolhida no modal ----------
  useEffect(() => {
    if (!modalAberto || !prof || !agData) return;
    (async () => {
      const { data: occ, error } = await supabase.rpc("horarios_ocupados", {
        p_profissional_id: prof.id,
        p_data: agData,
      });
      if (!error) {
        setAgOcupados(((occ as { hora: string }[]) ?? []).map((o) => o.hora));
      }
    })();
  }, [modalAberto, prof, agData]);

  // ---------- Grade de horarios do dia escolhido no modal ----------
  const agGrade = useMemo(() => {
    if (!agData) return [] as { hora: string; ocupado: boolean }[];
    const diaSemana = new Date(`${agData}T00:00:00`).getDay(); // 0=domingo
    const cfg = dias[diaSemana];
    if (!cfg || !cfg.ativo) return [];
    const ocupadosSet = new Set(agOcupados);
    const ini = paraMinutos(cfg.inicio);
    const fim = paraMinutos(cfg.fim);
    const slots: { hora: string; ocupado: boolean }[] = [];
    for (let m = ini; m + PASSO_MIN <= fim; m += PASSO_MIN) {
      const slot = paraHora(m);
      slots.push({ hora: slot, ocupado: ocupadosSet.has(slot) });
    }
    return slots;
  }, [agData, dias, agOcupados]);

  const agPodeConfirmar =
    !!agServico &&
    !!agHora &&
    agNome.trim().length > 1 &&
    agTelefone.trim().length > 7;

  function abrirModalAgendar() {
    setAgNome("");
    setAgTelefone("");
    setAgServico(servicos[0]?.nome ?? "");
    setAgData(hojeISO());
    setAgHora("");
    setAgErro(null);
    setAgLink(null);
    setAgLinkCopiado(false);
    setModalAberto(true);
  }

  // ---------- Confirmar agendamento feito pelo profissional ----------
  async function agendarParaCliente() {
    if (!prof || !agPodeConfirmar) return;
    setAgErro(null);
    setAgEnviando(true);
    const { data, error } = await supabase.rpc("agendar", {
      p_profissional_id: prof.id,
      p_servico: agServico,
      p_data: agData,
      p_hora: agHora,
      p_cliente_nome: agNome,
      p_cliente_telefone: agTelefone,
    });
    setAgEnviando(false);
    if (error) {
      setAgErro(error.message);
      // Pode ter ficado ocupado nesse meio tempo: recarrega a grade.
      const { data: occ } = await supabase.rpc("horarios_ocupados", {
        p_profissional_id: prof.id,
        p_data: agData,
      });
      setAgOcupados(((occ as { hora: string }[]) ?? []).map((o) => o.hora));
      setAgHora("");
      return;
    }
    const linha = ((data as { id: string; token: string }[]) ?? [])[0];
    if (linha) {
      setAgLink(
        `${window.location.origin}/cliente?id=${prof.id}&token=${linha.token}`,
      );
      // Mostra o novo agendamento na agenda sem recarregar a pagina.
      setAgendamentos((prev) =>
        [
          ...prev,
          {
            id: linha.id,
            cliente_nome: agNome.trim(),
            cliente_telefone: agTelefone.trim(),
            servico: agServico,
            data: agData,
            hora: agHora,
            status: "confirmado" as const,
          },
        ].sort(
          (a, b) =>
            a.data.localeCompare(b.data) || a.hora.localeCompare(b.hora),
        ),
      );
    }
  }

  async function copiarLinkAgendamento() {
    if (!agLink) return;
    try {
      await navigator.clipboard.writeText(agLink);
      setAgLinkCopiado(true);
      setTimeout(() => setAgLinkCopiado(false), 2000);
    } catch {
      setAgErro("Não consegui copiar. Copie manualmente o link acima.");
    }
  }

  // ---------- Cancelar agendamento ----------
  async function cancelar(id: string) {
    setCancelandoId(id);
    const { error } = await supabase
      .from("agendamentos")
      .update({ status: "cancelado" })
      .eq("id", id);
    setCancelandoId(null);
    if (error) {
      setErro(error.message);
      return;
    }
    setAgendamentos((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: "cancelado" } : a)),
    );
  }

  // ---------- Salvar horários de atendimento ----------
  async function salvarHorarios() {
    if (!prof) return;
    setErro(null);
    setHorariosOk(false);

    const ativos = dias
      .map((d, dia_semana) => ({ ...d, dia_semana }))
      .filter((d) => d.ativo);

    if (ativos.some((d) => d.fim <= d.inicio)) {
      setErro("Em algum dia o horário de fim não é maior que o de início.");
      return;
    }

    setSalvandoHorarios(true);
    // Estratégia simples: apaga tudo do profissional e regrava os ativos.
    const del = await supabase
      .from("horarios_disponiveis")
      .delete()
      .eq("profissional_id", prof.id);
    if (del.error) {
      setSalvandoHorarios(false);
      setErro(del.error.message);
      return;
    }
    if (ativos.length) {
      const ins = await supabase.from("horarios_disponiveis").insert(
        ativos.map((d) => ({
          profissional_id: prof.id,
          dia_semana: d.dia_semana,
          hora_inicio: d.inicio,
          hora_fim: d.fim,
        })),
      );
      if (ins.error) {
        setSalvandoHorarios(false);
        setErro(ins.error.message);
        return;
      }
    }
    setSalvandoHorarios(false);
    setHorariosOk(true);
    setTimeout(() => setHorariosOk(false), 2500);
  }

  function atualizarDia(i: number, patch: Partial<DiaConfig>) {
    setDias((prev) => prev.map((d, idx) => (idx === i ? { ...d, ...patch } : d)));
  }

  // ---------- Serviços ----------
  async function adicionarServico(e: React.FormEvent) {
    e.preventDefault();
    if (!prof) return;
    const nome = novoNome.trim();
    if (nome.length < 2) {
      setErro("Dê um nome ao serviço (mínimo 2 caracteres).");
      return;
    }
    if (!Number.isFinite(novaDuracao) || novaDuracao <= 0) {
      setErro("A duração precisa ser maior que zero.");
      return;
    }
    setErro(null);
    setSalvandoServico(true);
    const { data, error } = await supabase
      .from("servicos")
      .insert({
        profissional_id: prof.id,
        nome,
        duracao_min: novaDuracao,
      })
      .select("id, nome, duracao_min")
      .single();
    setSalvandoServico(false);
    if (error) {
      setErro(error.message);
      return;
    }
    setServicos((prev) =>
      [...prev, data as Servico].sort((a, b) => a.nome.localeCompare(b.nome)),
    );
    setNovoNome("");
    setNovaDuracao(30);
  }

  async function removerServico(id: string) {
    setErro(null);
    setRemovendoServicoId(id);
    const { error } = await supabase.from("servicos").delete().eq("id", id);
    setRemovendoServicoId(null);
    if (error) {
      setErro(error.message);
      return;
    }
    setServicos((prev) => prev.filter((s) => s.id !== id));
  }

  async function salvarEdicao() {
    if (!editandoId || !editNome.trim()) return;
    setErro(null);
    setSalvandoEdicao(true);
    const { error } = await supabase
      .from("servicos")
      .update({ nome: editNome.trim(), duracao_min: editDuracao })
      .eq("id", editandoId);
    setSalvandoEdicao(false);
    if (error) {
      setErro(error.message);
      return;
    }
    setServicos((prev) =>
      prev
        .map((s) =>
          s.id === editandoId
            ? { ...s, nome: editNome.trim(), duracao_min: editDuracao }
            : s,
        )
        .sort((a, b) => a.nome.localeCompare(b.nome)),
    );
    setEditandoId(null);
  }

  // ---------- Link público ----------
  async function copiarLink() {
    if (!prof) return;
    const link = `${window.location.origin}/cliente?id=${prof.id}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      setErro("Não consegui copiar. Copie manualmente: " + link);
    }
  }

  async function sair() {
    await supabase.auth.signOut();
    router.replace("/");
  }

  // =====================================================================
  if (carregando) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f4f1ea] text-[#999]">
        Carregando seu painel...
      </main>
    );
  }

  if (semPerfil) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#f4f1ea] px-6 text-center">
        <p className="max-w-sm text-[#666]">
          Este login não tem um negócio cadastrado. Se você é o administrador,
          acesse o painel de administração.
        </p>
        <button
          onClick={sair}
          className="rounded-[9px] bg-[#1a1a1a] px-5 py-2.5 font-medium text-white"
        >
          Sair
        </button>
      </main>
    );
  }

  const campoHora =
    "rounded-lg border border-[#e6e0d4] bg-[#fafaf7] px-2.5 py-1.5 text-sm";

  return (
    <div className="min-h-screen bg-[#f4f1ea] text-[#1a1a1a]">
      {/* ---------- Cabeçalho ---------- */}
      <header className="bg-[#1a1a1a] text-[#f4f1ea]">
        <div className="mx-auto flex max-w-[1000px] items-center justify-between gap-3 px-5 py-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="font-display text-xl font-semibold">
                {prof?.nome}
              </h1>
              <span
                className="rounded-full px-2.5 py-0.5 text-xs font-bold"
                style={{ background: cor + "33", color: "#fff" }}
              >
                {rotuloNicho}
              </span>
            </div>
            <p className="mt-0.5 text-xs opacity-60">Painel do profissional</p>
          </div>
          <button
            onClick={sair}
            className="rounded-[9px] border border-white/20 px-4 py-2 text-sm font-medium transition hover:bg-white/10"
          >
            Sair
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1000px] px-5 py-7">
        {erro && (
          <div className="mb-5 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
            {erro}
          </div>
        )}

        {/* ---------- Cards de resumo ---------- */}
        <section className="grid grid-cols-3 gap-3">
          {[
            { rotulo: "Hoje", valor: resumo.hoje },
            { rotulo: "Esta semana", valor: resumo.semana },
            { rotulo: "Total confirmados", valor: resumo.total },
          ].map((c) => (
            <div
              key={c.rotulo}
              className="rounded-[14px] border border-[#e6e0d4] bg-white p-4"
            >
              <div className="text-xs text-[#999]">{c.rotulo}</div>
              <div
                className="mt-1 font-display text-3xl font-bold"
                style={{ color: cor }}
              >
                {c.valor}
              </div>
            </div>
          ))}
        </section>

        {/* ---------- Link público ---------- */}
        <section className="mt-6 rounded-[14px] border border-[#e6e0d4] bg-white p-5">
          <h2 className="font-display text-lg font-semibold">
            Link para seus clientes
          </h2>
          <p className="mt-1 text-sm text-[#777]">
            Envie este link para o cliente marcar horário — sem precisar de
            login.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <code className="flex-1 overflow-x-auto rounded-lg border border-[#e6e0d4] bg-[#fafaf7] px-3 py-2 text-sm text-[#555]">
              {typeof window !== "undefined" ? window.location.origin : ""}
              /cliente?id={prof?.id}
            </code>
            <button
              onClick={copiarLink}
              className="rounded-[9px] px-4 py-2 text-sm font-bold text-white"
              style={{ background: copiado ? "#2a8a4a" : "#1a1a1a" }}
            >
              {copiado ? "Copiado!" : "Copiar link"}
            </button>
          </div>

          <div className="mt-4 border-t border-[#f0ece2] pt-4">
            <p className="text-sm text-[#777]">
              Ou marque você mesmo o horário do cliente e envie o link do
              agendamento por WhatsApp.
            </p>
            <button
              onClick={abrirModalAgendar}
              className="mt-3 rounded-[9px] px-4 py-2.5 text-sm font-bold text-white"
              style={{ background: cor }}
            >
              Agendar para cliente
            </button>
          </div>
        </section>

        {/* ---------- Serviços ---------- */}
        <section className="mt-6 rounded-[14px] border border-[#e6e0d4] bg-white p-5">
          <h2 className="font-display text-lg font-semibold">Serviços</h2>
          <p className="mt-1 text-sm text-[#777]">
            Cadastre os serviços que o cliente pode escolher ao marcar horário.
          </p>

          {/* lista */}
          <div className="mt-4 space-y-2">
            {servicos.length === 0 ? (
              <p className="text-sm text-[#999]">
                Nenhum serviço cadastrado ainda. Adicione o primeiro abaixo.
              </p>
            ) : (
              servicos.map((s) =>
                editandoId === s.id ? (
                  /* ---- linha de edicao inline ---- */
                  <div
                    key={s.id}
                    className="flex flex-wrap items-center gap-2 rounded-[10px] border bg-[#fafaf7] px-3.5 py-2.5"
                    style={{ borderColor: cor }}
                  >
                    <input
                      value={editNome}
                      onChange={(e) => setEditNome(e.target.value)}
                      className="min-w-0 flex-1 rounded-lg border border-[#e6e0d4] bg-white px-2.5 py-1.5 text-sm"
                      autoFocus
                    />
                    <input
                      type="number"
                      min={5}
                      step={5}
                      value={editDuracao}
                      onChange={(e) => setEditDuracao(Number(e.target.value))}
                      className="w-[80px] rounded-lg border border-[#e6e0d4] bg-white px-2.5 py-1.5 text-sm"
                    />
                    <span className="text-[13px] text-[#888]">min</span>
                    <button
                      onClick={salvarEdicao}
                      disabled={salvandoEdicao || !editNome.trim()}
                      className="rounded-[7px] px-3 py-1.5 text-[13px] font-bold text-white disabled:opacity-50"
                      style={{ background: cor }}
                    >
                      {salvandoEdicao ? "Salvando..." : "Salvar"}
                    </button>
                    <button
                      onClick={() => setEditandoId(null)}
                      className="rounded-[7px] border border-[#e6e0d4] bg-white px-3 py-1.5 text-[13px] font-medium text-[#555]"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  /* ---- linha normal ---- */
                  <div
                    key={s.id}
                    className="flex items-center justify-between gap-3 rounded-[10px] border border-[#e6e0d4] bg-[#fafaf7] px-3.5 py-2.5"
                  >
                    <div>
                      <span className="font-medium">{s.nome}</span>
                      <span className="ml-2 text-[13px] text-[#888]">
                        {s.duracao_min} min
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditandoId(s.id);
                          setEditNome(s.nome);
                          setEditDuracao(s.duracao_min);
                        }}
                        className="rounded-[7px] border border-[#e6e0d4] bg-white px-3 py-1.5 text-[13px] font-medium text-[#555]"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => removerServico(s.id)}
                        disabled={removendoServicoId === s.id}
                        className="rounded-[7px] border border-[#e6e0d4] bg-white px-3 py-1.5 text-[13px] font-medium text-[#c0392b] disabled:opacity-50"
                      >
                        {removendoServicoId === s.id ? "Removendo..." : "Remover"}
                      </button>
                    </div>
                  </div>
                ),
              )
            )}
          </div>

          {/* adicionar */}
          <form
            onSubmit={adicionarServico}
            className="mt-4 flex flex-wrap items-end gap-3 border-t border-[#f0ece2] pt-4"
          >
            <div className="flex-1 min-w-[180px]">
              <label className="mb-1.5 block text-[13px] font-medium text-[#666]">
                Nome do serviço
              </label>
              <input
                value={novoNome}
                onChange={(e) => setNovoNome(e.target.value)}
                placeholder="Ex.: Corte de cabelo"
                className="w-full rounded-lg border border-[#e6e0d4] bg-[#fafaf7] px-3 py-2 text-sm"
              />
            </div>
            <div className="w-[120px]">
              <label className="mb-1.5 block text-[13px] font-medium text-[#666]">
                Duração (min)
              </label>
              <input
                type="number"
                min={5}
                step={5}
                value={novaDuracao}
                onChange={(e) => setNovaDuracao(Number(e.target.value))}
                className="w-full rounded-lg border border-[#e6e0d4] bg-[#fafaf7] px-3 py-2 text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={salvandoServico}
              className="rounded-[9px] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
              style={{ background: cor }}
            >
              {salvandoServico ? "Adicionando..." : "Adicionar"}
            </button>
          </form>
        </section>

        {/* ---------- Horários de atendimento ---------- */}
        <section className="mt-6 rounded-[14px] border border-[#e6e0d4] bg-white p-5">
          <h2 className="font-display text-lg font-semibold">
            Horários de atendimento
          </h2>
          <p className="mt-1 text-sm text-[#777]">
            Marque os dias que você atende e o horário de cada um.
          </p>

          <div className="mt-4 space-y-2">
            {dias.map((d, i) => (
              <div
                key={i}
                className="flex flex-wrap items-center gap-3 border-b border-[#f0ece2] pb-2 last:border-0"
              >
                <label className="flex w-[150px] items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={d.ativo}
                    onChange={(e) => atualizarDia(i, { ativo: e.target.checked })}
                  />
                  {DIAS[i]}
                </label>
                <div
                  className="flex items-center gap-2"
                  style={{ opacity: d.ativo ? 1 : 0.4 }}
                >
                  <input
                    type="time"
                    value={d.inicio}
                    disabled={!d.ativo}
                    onChange={(e) => atualizarDia(i, { inicio: e.target.value })}
                    className={campoHora}
                  />
                  <span className="text-[#999]">até</span>
                  <input
                    type="time"
                    value={d.fim}
                    disabled={!d.ativo}
                    onChange={(e) => atualizarDia(i, { fim: e.target.value })}
                    className={campoHora}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={salvarHorarios}
              disabled={salvandoHorarios}
              className="rounded-[9px] py-2.5 px-5 text-sm font-bold text-white disabled:opacity-50"
              style={{ background: cor }}
            >
              {salvandoHorarios ? "Salvando..." : "Salvar horários"}
            </button>
            {horariosOk && (
              <span className="text-sm font-medium text-[#2a8a4a]">
                Horários salvos!
              </span>
            )}
          </div>
        </section>

        {/* ---------- Agenda por dia ---------- */}
        <section className="mt-6">
          <h2 className="mb-3 font-display text-lg font-semibold">
            Agenda
          </h2>

          {porDia.length === 0 ? (
            <div className="rounded-[14px] border border-dashed border-[#d8d2c4] bg-white/50 p-8 text-center text-sm text-[#999]">
              Nenhum agendamento ainda. Compartilhe seu link para os clientes
              começarem a marcar.
            </div>
          ) : (
            porDia.map(([data, lista]) => (
              <div key={data} className="mb-5">
                <h3 className="mb-2 text-sm font-medium text-[#888]">
                  {dataPorExtenso(data)}
                </h3>
                <div className="space-y-2">
                  {lista.map((a) => {
                    const cancelado = a.status === "cancelado";
                    return (
                      <div
                        key={a.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-[#e6e0d4] bg-white p-3.5"
                        style={{ opacity: cancelado ? 0.6 : 1 }}
                      >
                        <div className="flex items-center gap-3.5">
                          <div
                            className="min-w-[52px] font-display text-lg font-semibold"
                            style={{ color: cor }}
                          >
                            {hhmm(a.hora)}
                          </div>
                          <div>
                            <div
                              className="font-bold"
                              style={{
                                textDecoration: cancelado
                                  ? "line-through"
                                  : "none",
                              }}
                            >
                              {a.cliente_nome}
                            </div>
                            <div className="text-[13px] text-[#888]">
                              {a.servico} · {a.cliente_telefone}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <span
                            className="rounded-full px-2.5 py-1 text-xs font-bold"
                            style={{
                              background: cancelado ? "#fbe3e0" : "#e3f5e8",
                              color: cancelado ? "#c0392b" : "#2a8a4a",
                            }}
                          >
                            {a.status}
                          </span>
                          {!cancelado && (
                            <button
                              onClick={() => cancelar(a.id)}
                              disabled={cancelandoId === a.id}
                              className="rounded-[7px] border border-[#e6e0d4] bg-[#f4f1ea] px-3 py-1.5 text-[13px] font-medium text-[#c0392b] disabled:opacity-50"
                            >
                              {cancelandoId === a.id
                                ? "Cancelando..."
                                : "Cancelar"}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </section>
      </main>

      {/* ---------- Modal: Agendar para cliente ---------- */}
      {modalAberto && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:items-center"
          onClick={() => setModalAberto(false)}
        >
          <div
            className="my-auto w-full max-w-[460px] rounded-[14px] border border-[#e6e0d4] bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold">
                Agendar para cliente
              </h2>
              <button
                onClick={() => setModalAberto(false)}
                aria-label="Fechar"
                className="rounded-[7px] px-2 py-1 text-xl leading-none text-[#999] hover:bg-[#f4f1ea]"
              >
                ×
              </button>
            </div>

            {agErro && (
              <div className="mt-3 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
                {agErro}
              </div>
            )}

            {agLink ? (
              /* -------- Sucesso: link gerado -------- */
              <div className="mt-4">
                <div className="rounded-[12px] border border-[#cfe9d6] bg-[#f0faf3] p-4 text-center">
                  <div className="text-[34px]">✅</div>
                  <p className="mt-1 font-medium text-[#2a8a4a]">
                    Agendamento criado!
                  </p>
                  <p className="mt-1 text-sm text-[#666]">
                    Copie o link abaixo e envie para o cliente no WhatsApp. Por
                    ele o cliente vê, cancela ou remarca o horário.
                  </p>
                </div>
                <code className="mt-3 block overflow-x-auto rounded-lg border border-[#e6e0d4] bg-[#fafaf7] px-3 py-2 text-sm text-[#555]">
                  {agLink}
                </code>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={copiarLinkAgendamento}
                    className="flex-1 rounded-[9px] px-4 py-2.5 text-sm font-bold text-white"
                    style={{ background: agLinkCopiado ? "#2a8a4a" : "#1a1a1a" }}
                  >
                    {agLinkCopiado ? "Copiado!" : "Copiar link"}
                  </button>
                  <button
                    onClick={() => setModalAberto(false)}
                    className="rounded-[9px] border border-[#e6e0d4] bg-white px-4 py-2.5 text-sm font-medium text-[#555]"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            ) : (
              /* -------- Formulario -------- */
              <div className="mt-4">
                {servicos.length === 0 ? (
                  <p className="text-sm text-[#999]">
                    Cadastre ao menos um serviço antes de agendar para um
                    cliente.
                  </p>
                ) : (
                  <>
                    <label className="mb-1.5 block text-[13px] font-medium text-[#666]">
                      Nome do cliente
                    </label>
                    <input
                      value={agNome}
                      onChange={(e) => setAgNome(e.target.value)}
                      placeholder="Como o cliente se chama?"
                      className="w-full rounded-[9px] border border-[#e6e0d4] bg-[#fafaf7] px-3.5 py-2.5 text-sm"
                    />

                    <label className="mb-1.5 mt-4 block text-[13px] font-medium text-[#666]">
                      Telefone
                    </label>
                    <input
                      value={agTelefone}
                      onChange={(e) => setAgTelefone(e.target.value)}
                      placeholder="(11) 99999-9999"
                      inputMode="tel"
                      className="w-full rounded-[9px] border border-[#e6e0d4] bg-[#fafaf7] px-3.5 py-2.5 text-sm"
                    />

                    <label className="mb-1.5 mt-4 block text-[13px] font-medium text-[#666]">
                      Serviço
                    </label>
                    <select
                      value={agServico}
                      onChange={(e) => setAgServico(e.target.value)}
                      className="w-full rounded-[9px] border border-[#e6e0d4] bg-[#fafaf7] px-3.5 py-2.5 text-sm"
                    >
                      {servicos.map((s) => (
                        <option key={s.id} value={s.nome}>
                          {s.nome} ({s.duracao_min} min)
                        </option>
                      ))}
                    </select>

                    <label className="mb-1.5 mt-4 block text-[13px] font-medium text-[#666]">
                      Dia
                    </label>
                    <input
                      type="date"
                      min={hojeISO()}
                      value={agData}
                      onChange={(e) => {
                        setAgData(e.target.value);
                        setAgHora("");
                      }}
                      className="w-full rounded-[9px] border border-[#e6e0d4] bg-[#fafaf7] px-3.5 py-2.5 text-sm"
                    />

                    <label className="mb-1.5 mt-4 block text-[13px] font-medium text-[#666]">
                      Horário disponível
                    </label>
                    {agGrade.length === 0 ? (
                      <p className="mb-2 text-sm text-[#999]">
                        Sem atendimento neste dia. Escolha outra data.
                      </p>
                    ) : (
                      <div className="mb-2 grid grid-cols-4 gap-2">
                        {agGrade.map(({ hora: h, ocupado }) => {
                          const sel = agHora === h;
                          return (
                            <button
                              key={h}
                              disabled={ocupado}
                              onClick={() => setAgHora(h)}
                              className="rounded-lg border py-2.5 text-sm font-medium"
                              style={{
                                background: sel
                                  ? cor
                                  : ocupado
                                    ? "#f0ece2"
                                    : "#fff",
                                color: sel
                                  ? "#fff"
                                  : ocupado
                                    ? "#ccc"
                                    : "#1a1a1a",
                                borderColor: sel ? cor : "#e6e0d4",
                                textDecoration: ocupado ? "line-through" : "none",
                                cursor: ocupado ? "not-allowed" : "pointer",
                              }}
                            >
                              {hhmm(h)}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    <button
                      onClick={agendarParaCliente}
                      disabled={!agPodeConfirmar || agEnviando}
                      className="mt-4 w-full rounded-[10px] py-3.5 text-[15px] font-bold text-white"
                      style={{
                        background:
                          !agPodeConfirmar || agEnviando ? "#ddd" : "#1a1a1a",
                        cursor:
                          !agPodeConfirmar || agEnviando
                            ? "not-allowed"
                            : "pointer",
                      }}
                    >
                      {agEnviando ? "Agendando..." : "Confirmar agendamento"}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
