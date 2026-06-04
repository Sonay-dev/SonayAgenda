-- =====================================================================
-- AgendaSonay - SEED de teste (1 profissional ativo + servicos + horarios)
-- Rode no Supabase: SQL Editor > New query > Run.
--
-- Como profissionais.id referencia auth.users, criamos primeiro um
-- usuario de auth "de mentira" so para satisfazer a FK. O cliente NAO
-- precisa de login; isso e so para existir um profissional para testar.
-- =====================================================================
do $$
declare
  v_uid uuid := gen_random_uuid();
begin
  -- 1) Usuario de auth (so para a FK). Login real nao e necessario p/ o teste.
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data
  )
  values (
    '00000000-0000-0000-0000-000000000000', v_uid, 'authenticated',
    'authenticated', 'barbearia.teste@exemplo.com',
    crypt('senha-teste-123', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb
  );

  -- 2) Profissional ATIVO
  insert into profissionais (id, nome, nicho, email, telefone, plano, vencimento)
  values (v_uid, 'Barbearia do Ze', 'barbearia',
          'barbearia.teste@exemplo.com', '11999999999',
          'ativo', current_date + 30);

  -- 3) Servicos
  insert into servicos (profissional_id, nome, duracao_min) values
    (v_uid, 'Corte de cabelo', 30),
    (v_uid, 'Barba', 20),
    (v_uid, 'Corte + Barba', 45);

  -- 4) Horarios de atendimento (dia_semana: 0=domingo ... 6=sabado)
  insert into horarios_disponiveis (profissional_id, dia_semana, hora_inicio, hora_fim) values
    (v_uid, 1, '09:00', '18:00'),
    (v_uid, 2, '09:00', '18:00'),
    (v_uid, 3, '09:00', '18:00'),
    (v_uid, 4, '09:00', '18:00'),
    (v_uid, 5, '09:00', '18:00'),
    (v_uid, 6, '09:00', '13:00');

  raise notice 'Profissional de teste criado com id %', v_uid;
end $$;
