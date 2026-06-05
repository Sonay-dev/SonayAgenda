-- =====================================================================
-- AgendaSonay - setup do painel admin
--
-- Roda DEPOIS de supabase/schema.sql, no Supabase em:
--   SQL Editor > New query > (colar) > Run.
-- Idempotente: pode rodar mais de uma vez sem erro.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) Coluna valor_mensal (mensalidade que o profissional paga ao Sonay)
--    O schema inicial nao tinha esse campo; o painel admin usa ele para
--    mostrar o valor por profissional e somar a receita recorrente.
-- ---------------------------------------------------------------------
alter table profissionais
  add column if not exists valor_mensal numeric(10,2) not null default 0;

-- ---------------------------------------------------------------------
-- 2) Proteger valor_mensal: so o admin pode alterar (alem de plano e
--    vencimento, que ja eram protegidos). Sem isso, um profissional
--    poderia mudar a propria mensalidade via API (tem update do proprio).
--    Substitui a funcao do trigger ja existente (profissionais_protege_plano).
-- ---------------------------------------------------------------------
create or replace function protege_plano()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not is_admin() then
    if new.plano is distinct from old.plano
       or new.vencimento is distinct from old.vencimento
       or new.valor_mensal is distinct from old.valor_mensal then
      raise exception 'Apenas o admin pode alterar plano, vencimento ou valor';
    end if;
  end if;
  return new;
end;
$$;

-- =====================================================================
-- Observacoes:
-- - O acesso do admin aos dados ja e garantido pelas policies do schema
--   (admin_le_todos / admin_atualiza_todos / admin_exclui via is_admin()).
-- - is_admin() compara o e-mail do JWT com 'sonaydev88@gmail.com'.
-- - Crie o usuario admin em Authentication > Users (Auto Confirm) com esse
--   e-mail. Como ele nao tem nicho, nao vira um profissional.
-- =====================================================================
