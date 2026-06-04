-- =====================================================================
-- AgendaSonay - setup de autenticacao (login/cadastro)
--
-- Roda DEPOIS do supabase/schema.sql, no Supabase em:
--   SQL Editor > New query > (colar) > Run.
--
-- IMPORTANTE: o passo 1 (ALTER TYPE ... ADD VALUE) NAO pode rodar junto
-- com outras instrucoes na mesma execucao. Por isso ele esta separado:
-- rode CADA "alter type" sozinho (cole, Run; cole o outro, Run) e SO
-- DEPOIS rode o passo 2 (funcao + trigger).
-- =====================================================================


-- ---------------------------------------------------------------------
-- PASSO 1 - Ampliar o enum `nicho` (rode UMA LINHA POR VEZ)
-- O schema inicial so tinha barbearia/estetica/personal. O cadastro do
-- app oferece 5 nichos, entao adicionamos salao e fisioterapia.
-- ---------------------------------------------------------------------

alter type nicho add value if not exists 'salao';

alter type nicho add value if not exists 'fisioterapia';


-- ---------------------------------------------------------------------
-- PASSO 2 - Criacao do perfil de profissional
--
-- ATENCAO: a abordagem por TRIGGER em auth.users foi ABANDONADA. O
-- Supabase (free tier) nao permite criar trigger no schema `auth` pelo
-- SQL Editor (permission denied / must be owner).
--
-- Em vez disso, a linha em `profissionais` e criada pelo PROPRIO APP, no
-- route handler /auth/confirm (src/app/auth/confirm/route.ts), logo apos
-- o usuario confirmar o e-mail. Nesse ponto ele ja esta autenticado,
-- entao a policy de RLS `profissional_insere_proprio` (auth.uid() = id)
-- permite o insert. Nao e preciso rodar nada aqui.
--
-- A funcao handle_new_user() pode ter sido criada numa tentativa anterior;
-- como nao ha mais trigger chamando ela, e inofensiva. Para remover:
--   drop function if exists handle_new_user();
-- ---------------------------------------------------------------------


-- =====================================================================
-- Depois deste SQL, falta so a config no painel Authentication:
--   - URL Configuration: Site URL + Redirect URL (.../auth/confirm)
--   - Email Templates "Confirm signup" e "Reset Password" apontando para
--     {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=...&next=...
--   - Manter "Confirm email" ligado
--   - Criar o usuario admin (sonaydev88@gmail.com) com Auto Confirm
-- =====================================================================
