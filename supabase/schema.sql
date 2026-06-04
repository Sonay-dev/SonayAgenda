-- =====================================================================
-- AgendaSonay - schema inicial (tabelas + RLS + funcoes publicas)
-- Baseado no prd.md (secoes 6 e 7).
--
-- COMO USAR: cole este arquivo INTEIRO no Supabase em
--   SQL Editor > New query > (colar) > Run.
-- Feito para rodar UMA VEZ num projeto novo/limpo. Re-rodar dara erro
-- de "ja existe" nos objetos (tabelas/tipos).
--
-- Modelo de acesso:
--   - profissional  -> logado (Supabase Auth). Ve so os proprios dados.
--   - admin         -> sonaydev88@gmail.com. Gerencia todos os profissionais.
--   - cliente final -> SEM login. So usa as funcoes publicas abaixo.
-- =====================================================================

create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------
-- Tipos (enums)
-- ----------------------------------------------------------------------
-- Nichos com cor definida no prd.md (secao 10). Para adicionar outro:
--   alter type nicho add value 'fisioterapia';
create type nicho as enum ('barbearia', 'estetica', 'personal');
create type plano_status as enum ('ativo', 'inadimplente');
create type agendamento_status as enum ('confirmado', 'cancelado');

-- ----------------------------------------------------------------------
-- Tabelas
-- ----------------------------------------------------------------------

-- profissionais.id = id do usuario no Supabase Auth (liga login <-> perfil)
create table profissionais (
  id          uuid primary key references auth.users (id) on delete cascade,
  nome        text not null,
  nicho       nicho not null,
  email       text not null,
  telefone    text,
  plano       plano_status not null default 'ativo',
  vencimento  date,
  criado_em   timestamptz not null default now()
);

create table servicos (
  id              uuid primary key default gen_random_uuid(),
  profissional_id uuid not null references profissionais (id) on delete cascade,
  nome            text not null,
  duracao_min     integer not null default 30 check (duracao_min > 0)
);

create table horarios_disponiveis (
  id              uuid primary key default gen_random_uuid(),
  profissional_id uuid not null references profissionais (id) on delete cascade,
  dia_semana      smallint not null check (dia_semana between 0 and 6), -- 0=domingo ... 6=sabado
  hora_inicio     time not null,
  hora_fim        time not null,
  check (hora_fim > hora_inicio)
);

create table agendamentos (
  id                uuid primary key default gen_random_uuid(),
  profissional_id   uuid not null references profissionais (id) on delete cascade,
  cliente_nome      text not null,
  cliente_telefone  text not null,
  servico           text not null,
  data              date not null,
  hora              time not null,
  status            agendamento_status not null default 'confirmado',
  token             uuid not null default gen_random_uuid(), -- segredo p/ remarcar/cancelar sem login
  criado_em         timestamptz not null default now()
);

-- Regra do prd.md (secao 7): horario ocupado nao pode ser marcado de novo.
-- Indice unico parcial -> impede 2 agendamentos CONFIRMADOS no mesmo slot.
create unique index agendamentos_slot_unico
  on agendamentos (profissional_id, data, hora)
  where status = 'confirmado';

-- ----------------------------------------------------------------------
-- Helper: quem e admin (por e-mail do JWT) - prd.md secao 7
-- ----------------------------------------------------------------------
create or replace function is_admin()
returns boolean
language sql
stable
set search_path = public
as $$
  select coalesce(auth.jwt() ->> 'email', '') = 'sonaydev88@gmail.com';
$$;

-- ----------------------------------------------------------------------
-- RLS - liga em tudo. Sem policy = ninguem acessa (default deny).
-- ----------------------------------------------------------------------
alter table profissionais        enable row level security;
alter table servicos             enable row level security;
alter table horarios_disponiveis enable row level security;
alter table agendamentos         enable row level security;

-- profissionais: dono gerencia o proprio; admin gerencia todos -----------
create policy profissional_le_proprio on profissionais
  for select using (auth.uid() = id);
create policy profissional_insere_proprio on profissionais
  for insert with check (auth.uid() = id);
create policy profissional_atualiza_proprio on profissionais
  for update using (auth.uid() = id) with check (auth.uid() = id);

create policy admin_le_todos on profissionais
  for select using (is_admin());
create policy admin_atualiza_todos on profissionais
  for update using (is_admin()) with check (is_admin());
create policy admin_exclui on profissionais
  for delete using (is_admin());

-- So o admin altera plano/vencimento (controle de cobranca do prd.md).
create or replace function protege_plano()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not is_admin() then
    if new.plano is distinct from old.plano
       or new.vencimento is distinct from old.vencimento then
      raise exception 'Apenas o admin pode alterar plano/vencimento';
    end if;
  end if;
  return new;
end;
$$;
create trigger profissionais_protege_plano
  before update on profissionais
  for each row execute function protege_plano();

-- servicos / horarios: so o dono mexe direto (leitura publica e via funcao)
create policy servicos_dono_tudo on servicos
  for all using (auth.uid() = profissional_id)
  with check (auth.uid() = profissional_id);

create policy horarios_dono_tudo on horarios_disponiveis
  for all using (auth.uid() = profissional_id)
  with check (auth.uid() = profissional_id);

-- agendamentos: SO o profissional dono ve/gerencia (com nome/telefone do cliente).
-- O publico NAO tem policy aqui -> nao le dados pessoais (LGPD).
create policy agendamentos_dono_tudo on agendamentos
  for all using (auth.uid() = profissional_id)
  with check (auth.uid() = profissional_id);

-- ----------------------------------------------------------------------
-- API PUBLICA (cliente sem login) - tudo via funcoes SECURITY DEFINER.
-- Elas rodam com privilegio do dono e expoem so o necessario.
-- ----------------------------------------------------------------------

-- Lista os profissionais ATIVOS (so id, nome e nicho/cor) p/ a tela do cliente.
create or replace function profissionais_ativos()
returns table (id uuid, nome text, nicho nicho)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.nome, p.nicho
  from profissionais p
  where p.plano = 'ativo'
  order by p.nome;
$$;

-- Dados publicos do profissional (so nome e nicho/cor) para montar a tela.
create or replace function profissional_publico(p_id uuid)
returns table (id uuid, nome text, nicho nicho)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.nome, p.nicho from profissionais p where p.id = p_id;
$$;

-- Lista de servicos do profissional (para o cliente escolher).
create or replace function servicos_publico(p_profissional_id uuid)
returns table (id uuid, nome text, duracao_min integer)
language sql
stable
security definer
set search_path = public
as $$
  select s.id, s.nome, s.duracao_min
  from servicos s
  where s.profissional_id = p_profissional_id;
$$;

-- Janelas de atendimento do profissional (dias/horas que ele atende).
create or replace function horarios_publico(p_profissional_id uuid)
returns table (dia_semana smallint, hora_inicio time, hora_fim time)
language sql
stable
security definer
set search_path = public
as $$
  select h.dia_semana, h.hora_inicio, h.hora_fim
  from horarios_disponiveis h
  where h.profissional_id = p_profissional_id;
$$;

-- Horarios JA ocupados num dia (so a hora, sem nome/telefone de ninguem).
create or replace function horarios_ocupados(p_profissional_id uuid, p_data date)
returns table (hora time)
language sql
stable
security definer
set search_path = public
as $$
  select a.hora
  from agendamentos a
  where a.profissional_id = p_profissional_id
    and a.data = p_data
    and a.status = 'confirmado';
$$;

-- Marcar horario. Devolve id + token (o token vai no link do cliente).
create or replace function agendar(
  p_profissional_id  uuid,
  p_servico          text,
  p_data             date,
  p_hora             time,
  p_cliente_nome     text,
  p_cliente_telefone text
)
returns table (id uuid, token uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id    uuid;
  v_token uuid;
begin
  if length(trim(coalesce(p_cliente_nome, ''))) = 0
     or length(trim(coalesce(p_cliente_telefone, ''))) = 0 then
    raise exception 'Nome e telefone sao obrigatorios';
  end if;
  if p_data < current_date then
    raise exception 'Nao e possivel agendar em data passada';
  end if;

  insert into agendamentos
    (profissional_id, cliente_nome, cliente_telefone, servico, data, hora)
  values
    (p_profissional_id, trim(p_cliente_nome), trim(p_cliente_telefone),
     p_servico, p_data, p_hora)
  returning agendamentos.id, agendamentos.token into v_id, v_token;

  return query select v_id, v_token;
exception
  when unique_violation then
    raise exception 'Esse horario acabou de ser ocupado. Escolha outro.';
end;
$$;

-- Cancelar: precisa do id + token (so quem tem o link cancela).
create or replace function cancelar_agendamento(p_id uuid, p_token uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update agendamentos
     set status = 'cancelado'
   where id = p_id and token = p_token and status = 'confirmado';
  if not found then
    raise exception 'Agendamento nao encontrado ou ja cancelado';
  end if;
end;
$$;

-- Remarcar: muda data/hora, validando id + token e sem date no passado.
create or replace function remarcar_agendamento(
  p_id uuid, p_token uuid, p_nova_data date, p_nova_hora time
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_nova_data < current_date then
    raise exception 'Nao e possivel remarcar para data passada';
  end if;
  update agendamentos
     set data = p_nova_data, hora = p_nova_hora
   where id = p_id and token = p_token and status = 'confirmado';
  if not found then
    raise exception 'Agendamento nao encontrado ou ja cancelado';
  end if;
exception
  when unique_violation then
    raise exception 'Esse horario ja esta ocupado. Escolha outro.';
end;
$$;

-- Quem pode chamar cada funcao -----------------------------------------
-- Publicas (cliente sem login = anon) e tambem profissional logado:
grant execute on function profissionais_ativos()                to anon, authenticated;
grant execute on function profissional_publico(uuid)            to anon, authenticated;
grant execute on function servicos_publico(uuid)                to anon, authenticated;
grant execute on function horarios_publico(uuid)                to anon, authenticated;
grant execute on function horarios_ocupados(uuid, date)         to anon, authenticated;
grant execute on function agendar(uuid, text, date, time, text, text) to anon, authenticated;
grant execute on function cancelar_agendamento(uuid, uuid)      to anon, authenticated;
grant execute on function remarcar_agendamento(uuid, uuid, date, time) to anon, authenticated;

-- =====================================================================
-- Fim. Tabelas: profissionais, servicos, horarios_disponiveis, agendamentos.
-- =====================================================================
