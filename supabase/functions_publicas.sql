-- =====================================================================
-- AgendaSonay - API PUBLICA (cliente sem login)
--
-- Todas as funcoes da tela publica /cliente, em SECURITY DEFINER: rodam
-- com privilegio do dono e expoem so o necessario, sem precisar abrir RLS
-- nas tabelas (agendamentos tem dado pessoal -> LGPD).
--
-- COMO USAR: cole este arquivo INTEIRO no Supabase em
--   SQL Editor > New query > (colar) > Run.
-- Idempotente: tudo e "create or replace", pode rodar quantas vezes quiser.
--
-- Depende das tabelas/tipos de supabase/schema.sql (profissionais, servicos,
-- horarios_disponiveis, agendamentos e os enums).
-- =====================================================================

-- ---------------------------------------------------------------------
-- Leitura publica
-- ---------------------------------------------------------------------

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

-- Dados publicos de um profissional (so nome e nicho/cor) para montar a tela.
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

-- ---------------------------------------------------------------------
-- Escrita publica (marcar / cancelar / remarcar) - protegidas por token
-- ---------------------------------------------------------------------

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

-- Remarcar: muda data/hora, validando id + token e sem data no passado.
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

-- ---------------------------------------------------------------------
-- GRANTS: quem pode chamar cada funcao
-- anon          = cliente sem login (tela publica /cliente)
-- authenticated = profissional logado (tambem pode usar as publicas)
-- ---------------------------------------------------------------------
grant execute on function profissionais_ativos()                      to anon, authenticated;
grant execute on function profissional_publico(uuid)                  to anon, authenticated;
grant execute on function servicos_publico(uuid)                      to anon, authenticated;
grant execute on function horarios_publico(uuid)                      to anon, authenticated;
grant execute on function horarios_ocupados(uuid, date)               to anon, authenticated;
grant execute on function agendar(uuid, text, date, time, text, text) to anon, authenticated;
grant execute on function cancelar_agendamento(uuid, uuid)            to anon, authenticated;
grant execute on function remarcar_agendamento(uuid, uuid, date, time) to anon, authenticated;

-- =====================================================================
-- Verificacao (opcional): as 8 funcoes devem existir e anon poder executar.
--
--   select p.proname,
--          has_function_privilege('anon', p.oid, 'EXECUTE') as anon_pode
--   from pg_proc p
--   join pg_namespace n on n.oid = p.pronamespace
--   where n.nspname = 'public'
--     and p.proname in (
--       'profissionais_ativos','profissional_publico','servicos_publico',
--       'horarios_publico','horarios_ocupados','agendar',
--       'cancelar_agendamento','remarcar_agendamento'
--     )
--   order by p.proname;
-- =====================================================================
