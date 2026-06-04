import React, { useState, useMemo } from "react";

// ===== Dados de exemplo (no produto real isto vem do Supabase) =====
const NICHOS = {
  barbearia: { label: "Barbearia", accent: "#d4915d", servicos: ["Corte", "Barba", "Corte + Barba", "Pezinho"] },
  estetica: { label: "Clínica de Estética", accent: "#c97b94", servicos: ["Limpeza de pele", "Massagem", "Depilação", "Drenagem"] },
  personal: { label: "Personal Trainer", accent: "#5d9bd4", servicos: ["Avaliação", "Treino 1h", "Treino dupla", "Consultoria"] },
};

const PROFISSIONAIS_INICIAL = [
  { id: 1, nome: "Studio Léo Barbearia", nicho: "barbearia", plano: "Ativo", desde: "2026-04-12", valor: 80 },
  { id: 2, nome: "Clínica Renove", nicho: "estetica", plano: "Ativo", desde: "2026-05-02", valor: 120 },
  { id: 3, nome: "Bruno Personal", nicho: "personal", plano: "Inadimplente", desde: "2026-03-20", valor: 80 },
];

const AGENDAMENTOS_INICIAL = [
  { id: 1, profId: 1, cliente: "Marcos Silva", servico: "Corte + Barba", data: "2026-06-04", hora: "14:00", status: "confirmado" },
  { id: 2, profId: 1, cliente: "João Pereira", servico: "Corte", data: "2026-06-04", hora: "15:30", status: "confirmado" },
  { id: 3, profId: 1, cliente: "Rafael Costa", servico: "Barba", data: "2026-06-05", hora: "10:00", status: "pendente" },
];

const FONT = "'DM Sans', -apple-system, sans-serif";
const DISPLAY = "'Fraunces', Georgia, serif";

export default function App() {
  const [view, setView] = useState("cliente"); // cliente | profissional | admin
  const [profissionais, setProfissionais] = useState(PROFISSIONAIS_INICIAL);
  const [agendamentos, setAgendamentos] = useState(AGENDAMENTOS_INICIAL);

  return (
    <div style={{ fontFamily: FONT, minHeight: "100vh", background: "#f4f1ea", color: "#1a1a1a" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=DM+Sans:wght@400;500;700&display=swap');
        * { box-sizing: border-box; margin: 0; }
        button { font-family: inherit; cursor: pointer; border: none; }
        .card { background: #fff; border: 1px solid #e6e0d4; border-radius: 14px; }
        .fade { animation: fade .4s ease; }
        @keyframes fade { from { opacity: 0; transform: translateY(8px);} to {opacity:1; transform:none;} }
      `}</style>

      {/* Topo / alternador de visão */}
      <header style={{ background: "#1a1a1a", color: "#f4f1ea", padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: "linear-gradient(135deg,#22d3ee,#a855f7)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontFamily: DISPLAY }}>S</div>
          <span style={{ fontFamily: DISPLAY, fontSize: 19, fontWeight: 600 }}>AgendaSonay</span>
        </div>
        <nav style={{ display: "flex", gap: 6, background: "#2a2a2a", padding: 4, borderRadius: 10 }}>
          {[["cliente", "Cliente"], ["profissional", "Profissional"], ["admin", "Admin (você)"]].map(([k, l]) => (
            <button key={k} onClick={() => setView(k)}
              style={{ padding: "8px 14px", borderRadius: 7, fontSize: 13, fontWeight: 500,
                background: view === k ? "#f4f1ea" : "transparent", color: view === k ? "#1a1a1a" : "#bbb" }}>
              {l}
            </button>
          ))}
        </nav>
      </header>

      <main style={{ maxWidth: 1000, margin: "0 auto", padding: "28px 20px" }}>
        {view === "cliente" && <TelaCliente profissionais={profissionais} agendamentos={agendamentos} setAgendamentos={setAgendamentos} />}
        {view === "profissional" && <TelaProfissional profissionais={profissionais} agendamentos={agendamentos} setAgendamentos={setAgendamentos} />}
        {view === "admin" && <TelaAdmin profissionais={profissionais} setProfissionais={setProfissionais} agendamentos={agendamentos} />}
      </main>
    </div>
  );
}

// ============ TELA CLIENTE (agendamento via app/whatsapp) ============
function TelaCliente({ profissionais, agendamentos, setAgendamentos }) {
  const [profId, setProfId] = useState(profissionais[0]?.id);
  const prof = profissionais.find((p) => p.id === profId);
  const nicho = NICHOS[prof?.nicho];
  const [nome, setNome] = useState("");
  const [servico, setServico] = useState(nicho?.servicos[0]);
  const [hora, setHora] = useState("");
  const [ok, setOk] = useState(false);

  const horarios = ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00", "17:00"];
  const ocupados = agendamentos.filter((a) => a.profId === profId && a.data === "2026-06-04").map((a) => a.hora);

  function agendar() {
    if (!nome || !hora) return;
    setAgendamentos((prev) => [...prev, { id: Date.now(), profId, cliente: nome, servico, data: "2026-06-04", hora, status: "confirmado" }]);
    setOk(true);
  }

  if (ok) return (
    <div className="card fade" style={{ padding: 40, textAlign: "center", maxWidth: 440, margin: "40px auto" }}>
      <div style={{ fontSize: 44 }}>✅</div>
      <h2 style={{ fontFamily: DISPLAY, fontSize: 26, margin: "12px 0 6px" }}>Agendamento confirmado!</h2>
      <p style={{ color: "#666", lineHeight: 1.5 }}>{nome}, seu horário de <b>{servico}</b> às <b>{hora}</b> está reservado. Você receberá um lembrete no WhatsApp 1 dia antes.</p>
      <button onClick={() => { setOk(false); setNome(""); setHora(""); }} style={{ marginTop: 20, padding: "11px 22px", borderRadius: 9, background: "#1a1a1a", color: "#fff", fontWeight: 500 }}>Novo agendamento</button>
    </div>
  );

  return (
    <div className="fade">
      <div style={{ textAlign: "center", marginBottom: 22 }}>
        <span style={{ fontSize: 13, color: "#999", letterSpacing: 1, textTransform: "uppercase" }}>O que o cliente vê</span>
      </div>
      <div className="card" style={{ padding: 28, maxWidth: 460, margin: "0 auto" }}>
        <select value={profId} onChange={(e) => { setProfId(+e.target.value); }} style={selectStyle}>
          {profissionais.filter(p => p.plano === "Ativo").map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
        </select>
        <div style={{ display: "inline-block", padding: "3px 10px", borderRadius: 20, background: nicho.accent + "22", color: nicho.accent, fontSize: 12, fontWeight: 700, margin: "4px 0 18px" }}>{nicho.label}</div>

        <label style={labelStyle}>Seu nome</label>
        <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Como você se chama?" style={inputStyle} />

        <label style={labelStyle}>Serviço</label>
        <select value={servico} onChange={(e) => setServico(e.target.value)} style={selectStyle}>
          {nicho.servicos.map((s) => <option key={s}>{s}</option>)}
        </select>

        <label style={labelStyle}>Horário disponível — Quinta, 04/06</label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 22 }}>
          {horarios.map((h) => {
            const taken = ocupados.includes(h);
            return (
              <button key={h} disabled={taken} onClick={() => setHora(h)}
                style={{ padding: "10px 0", borderRadius: 8, fontSize: 14, fontWeight: 500,
                  background: hora === h ? nicho.accent : taken ? "#f0ece2" : "#fff",
                  color: hora === h ? "#fff" : taken ? "#ccc" : "#1a1a1a",
                  border: "1px solid " + (hora === h ? nicho.accent : "#e6e0d4"),
                  textDecoration: taken ? "line-through" : "none", cursor: taken ? "not-allowed" : "pointer" }}>
                {h}
              </button>
            );
          })}
        </div>

        <button onClick={agendar} disabled={!nome || !hora}
          style={{ width: "100%", padding: 14, borderRadius: 10, fontSize: 15, fontWeight: 700,
            background: (!nome || !hora) ? "#ddd" : "#1a1a1a", color: "#fff" }}>
          Confirmar agendamento
        </button>
      </div>
    </div>
  );
}

// ============ TELA PROFISSIONAL ============
function TelaProfissional({ profissionais, agendamentos, setAgendamentos }) {
  const prof = profissionais.find((p) => p.plano === "Ativo");
  const meus = agendamentos.filter((a) => a.profId === prof.id);
  const nicho = NICHOS[prof.nicho];

  function cancelar(id) { setAgendamentos((prev) => prev.filter((a) => a.id !== id)); }

  const porDia = useMemo(() => {
    const g = {};
    meus.forEach((a) => { (g[a.data] = g[a.data] || []).push(a); });
    return g;
  }, [meus]);

  return (
    <div className="fade">
      <div style={{ textAlign: "center", marginBottom: 22 }}>
        <span style={{ fontSize: 13, color: "#999", letterSpacing: 1, textTransform: "uppercase" }}>Painel do profissional</span>
        <h2 style={{ fontFamily: DISPLAY, fontSize: 26, marginTop: 4 }}>{prof.nome}</h2>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <Stat label="Agendamentos" valor={meus.length} accent={nicho.accent} />
        <Stat label="Hoje" valor={(porDia["2026-06-04"] || []).length} accent={nicho.accent} />
        <Stat label="Pendentes" valor={meus.filter(a => a.status === "pendente").length} accent={nicho.accent} />
      </div>

      {Object.entries(porDia).map(([data, lista]) => (
        <div key={data} style={{ marginBottom: 18 }}>
          <h3 style={{ fontSize: 14, color: "#888", marginBottom: 8 }}>{new Date(data + "T00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}</h3>
          {lista.sort((a, b) => a.hora.localeCompare(b.hora)).map((a) => (
            <div key={a.id} className="card" style={{ padding: 14, display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ fontFamily: DISPLAY, fontSize: 18, fontWeight: 600, color: nicho.accent, minWidth: 54 }}>{a.hora}</div>
                <div>
                  <div style={{ fontWeight: 700 }}>{a.cliente}</div>
                  <div style={{ fontSize: 13, color: "#888" }}>{a.servico}</div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 12, padding: "3px 9px", borderRadius: 20, fontWeight: 700,
                  background: a.status === "confirmado" ? "#e3f5e8" : "#fdf2e0", color: a.status === "confirmado" ? "#2a8a4a" : "#b8862a" }}>
                  {a.status}
                </span>
                <button onClick={() => cancelar(a.id)} style={{ padding: "6px 12px", borderRadius: 7, background: "#f4f1ea", color: "#c0392b", fontSize: 13, fontWeight: 500, border: "1px solid #e6e0d4" }}>Cancelar</button>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ============ TELA ADMIN (você) ============
function TelaAdmin({ profissionais, setProfissionais, agendamentos }) {
  const receita = profissionais.filter((p) => p.plano === "Ativo").reduce((s, p) => s + p.valor, 0);

  function alternar(id) {
    setProfissionais((prev) => prev.map((p) => p.id === id ? { ...p, plano: p.plano === "Ativo" ? "Inadimplente" : "Ativo" } : p));
  }
  function remover(id) { setProfissionais((prev) => prev.filter((p) => p.id !== id)); }

  return (
    <div className="fade">
      <div style={{ textAlign: "center", marginBottom: 22 }}>
        <span style={{ fontSize: 13, color: "#999", letterSpacing: 1, textTransform: "uppercase" }}>Seu painel de controle</span>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 22, flexWrap: "wrap" }}>
        <Stat label="Receita recorrente / mês" valor={"R$ " + receita} accent="#2a8a4a" big />
        <Stat label="Clientes ativos" valor={profissionais.filter(p => p.plano === "Ativo").length} accent="#1a1a1a" />
        <Stat label="Inadimplentes" valor={profissionais.filter(p => p.plano === "Inadimplente").length} accent="#c0392b" />
        <Stat label="Agendamentos no sistema" valor={agendamentos.length} accent="#5d9bd4" />
      </div>

      <div className="card" style={{ overflow: "hidden" }}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid #e6e0d4", fontWeight: 700, fontFamily: DISPLAY, fontSize: 17 }}>Profissionais cadastrados</div>
        {profissionais.map((p) => (
          <div key={p.id} style={{ padding: "14px 18px", borderBottom: "1px solid #f0ece2", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
            <div>
              <div style={{ fontWeight: 700 }}>{p.nome}</div>
              <div style={{ fontSize: 13, color: "#888" }}>{NICHOS[p.nicho].label} · R${p.valor}/mês · desde {new Date(p.desde).toLocaleDateString("pt-BR")}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 12, padding: "4px 10px", borderRadius: 20, fontWeight: 700,
                background: p.plano === "Ativo" ? "#e3f5e8" : "#fbe3e0", color: p.plano === "Ativo" ? "#2a8a4a" : "#c0392b" }}>{p.plano}</span>
              <button onClick={() => alternar(p.id)} style={{ padding: "6px 12px", borderRadius: 7, background: "#f4f1ea", border: "1px solid #e6e0d4", fontSize: 13, fontWeight: 500 }}>
                {p.plano === "Ativo" ? "Suspender" : "Reativar"}
              </button>
              <button onClick={() => remover(p.id)} style={{ padding: "6px 12px", borderRadius: 7, background: "#1a1a1a", color: "#fff", fontSize: 13, fontWeight: 500 }}>Remover</button>
            </div>
          </div>
        ))}
      </div>
      <p style={{ textAlign: "center", fontSize: 13, color: "#aaa", marginTop: 16 }}>Suspender = cliente não paga, bot e agenda dele param até regularizar.</p>
    </div>
  );
}

// ============ componentes auxiliares ============
function Stat({ label, valor, accent, big }) {
  return (
    <div className="card" style={{ padding: "16px 20px", flex: big ? "2 1 200px" : "1 1 130px" }}>
      <div style={{ fontSize: 12, color: "#999", marginBottom: 4 }}>{label}</div>
      <div style={{ fontFamily: DISPLAY, fontSize: big ? 30 : 26, fontWeight: 700, color: accent }}>{valor}</div>
    </div>
  );
}

const labelStyle = { display: "block", fontSize: 13, fontWeight: 500, color: "#666", marginBottom: 6 };
const inputStyle = { width: "100%", padding: "11px 13px", borderRadius: 9, border: "1px solid #e6e0d4", fontSize: 14, marginBottom: 16, fontFamily: FONT, background: "#fafaf7" };
const selectStyle = { ...inputStyle };
