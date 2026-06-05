# Checklist de produção — AgendaSonay

Validação das funcionalidades em produção (HTTPS): **https://sonay-agenda.vercel.app**

Deploy é automático a cada `git push` na branch `master`.

---

## ⚙️ Pré-requisitos (conferir primeiro)

Causa nº 1 de bug em produção. Confira antes de testar o resto.

- [ ] **Supabase → Authentication → URL Configuration**
  - [ ] **Site URL** = `https://sonay-agenda.vercel.app`
  - [ ] **Redirect URLs** inclui `https://sonay-agenda.vercel.app/auth/confirm`
  - > Sem isso, o link de redefinir senha aponta para `localhost` e não funciona.
- [ ] **Vercel → Settings → Environment Variables (Production)**
  - [ ] `NEXT_PUBLIC_SUPABASE_URL`
  - [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - > Se trocar uma variável, é preciso **redeploy**.
- [ ] Banco com os SQLs aplicados: `schema.sql`, `functions_publicas.sql`,
  `auth_setup.sql` (enum), `admin_setup.sql` (valor_mensal).
- [ ] Usuário admin criado (`sonaydev88@gmail.com`, Auto Confirm).

---

## ✅ Checklist funcional

### Entrada / marca
- [ ] `/` mostra a **splash** (logo sobre fundo escuro) e depois o **login**
- [ ] Recarregar na mesma aba → splash **não** reaparece (1x por sessão)

### Cadastro (confirmação de e-mail desligada → entra direto)
- [ ] `/cadastro` → criar negócio (nome + nicho + senha) → cai direto em `/profissional`
- [ ] Checklist de senha fica verde conforme digita; botão só ativa com tudo ok
- [ ] No Supabase, a linha em `profissionais` foi criada

### Login / Recuperação
- [ ] Login com senha errada → erro em PT
- [ ] Login correto (profissional) → `/profissional`
- [ ] **Esqueci minha senha** → chega e-mail → o link abre
  `https://sonay-agenda.vercel.app/redefinir-senha` (e **não** localhost) →
  troca a senha → login funciona

### Painel do profissional
- [ ] Cards de resumo carregam
- [ ] **Serviços**: adicionar e remover
- [ ] **Horários**: marcar dias/horas e salvar (recarregar e conferir persistência)
- [ ] **Copiar link** → começa com `https://sonay-agenda.vercel.app/cliente?id=...`
- [ ] **Cancelar** um agendamento muda o status
- [ ] **Sair** volta ao login

### Cliente (link público, sem login)
- [ ] Abrir o link em **aba anônima** → mostra negócio, nicho e serviços
- [ ] Dia útil mostra horários; horário já marcado aparece riscado
- [ ] Preencher e **Confirmar** → tela de sucesso com nome do negócio
- [ ] `/cliente` sem `?id=` → tela genérica; `?id=` inválido → erro amigável

### Admin (só `sonaydev88@gmail.com`)
- [ ] Login com o e-mail admin → `/admin`
- [ ] Login com profissional comum → redirecionado pra `/profissional` (não acessa `/admin`)
- [ ] Cards (receita, ativos, inadimplentes) e tabela carregam
- [ ] Editar **valor mensal** → recarregar e conferir que salvou
- [ ] **Suspender** um ativo → some do `/cliente?id=` dele (lista só mostra ativos)
- [ ] **Reativar** / **Remover** funcionam

---

## 📱 PWA (precisa de HTTPS — agora tem)

- [ ] **Android/Chrome**: menu (⋮) → **Instalar app** → abre em tela cheia com splash
- [ ] **iPhone/Safari**: Compartilhar → **Adicionar à Tela de Início** → abre standalone
- [ ] **Desktop/Chrome**: ícone de **instalar** na barra de endereço
- [ ] DevTools → Application → **Manifest** sem erros e **Service Worker** "activated"

---

## 🔒 Verificações de segurança

- [ ] Cliente anônimo no `/cliente` **não** vê nome/telefone de outros clientes
  (só horários ocupados)
- [ ] Profissional logado **não** vê dados de outro (RLS) — agenda só dele
- [ ] Abrir `/admin` deslogado → cai no login

---

## Dicas

- Use **abas anônimas** / navegadores diferentes para separar sessões
  (admin, profissional e cliente ao mesmo tempo).
- Após mudar config de auth no Supabase, **saia e entre de novo**
  (token em cache pode estar velho).
- Erro genérico "Não foi possível carregar" → quase sempre é Site URL/Redirect
  ou as funções públicas/permissões no banco.
