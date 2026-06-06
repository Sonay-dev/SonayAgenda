# AgendaSonay — Resumo Completo para Próxima Sessão

## Quem sou eu
- **Nome:** Wellington (Tom) | **Marca profissional:** Sonay / sonay.dev
- **E-mail admin:** sonaydev88@gmail.com
- **GitHub:** Sonay-dev | **Conta Vercel/Supabase:** tonzynhooh@gmail.com
- **Perfil:** Empreendedor brasileiro, SP, em transição pra tech. Aprende fazendo. Quer passo a passo direto, sem teoria desnecessária.

---

## O Produto
**AgendaSonay** — SaaS de agendamento para profissionais autônomos (barbearia, salão, estética, fisioterapia, personal trainer).

**URL de produção:** https://sonay-agenda.vercel.app  
**Repositório:** https://github.com/Sonay-dev/SonayAgenda (público)

---

## Stack
- **App:** Next.js 16 + React + TypeScript + Tailwind CSS
- **Banco:** Supabase (banco + autenticação)
- **Hospedagem:** Vercel (deploy automático a cada git push na master)
- **Bot WhatsApp:** n8n + Evolution API (no Railway — ainda não integrado ao app)
- **Pasta local:** `C:\Users\welli\programas note-old\SonayAgenda`

---

## O que está pronto (100% funcional em produção)

### Fluxo completo:
1. Profissional cadastra negócio → escolhe nicho → define serviços e horários
2. Copia o link público → manda pro cliente
3. Cliente abre o link, marca horário sem precisar criar conta
4. Profissional vê na agenda
5. Admin (eu) vê tudo no painel e controla quem paga

### Telas construídas:
- **/** — Splash da marca + tela de login (fundo escuro #15131f)
- **/cadastro** — Cadastro de negócio (nome + nicho + senha com checklist)
- **/profissional** — Painel do profissional (agenda, serviços, horários, link)
- **/admin** — Painel admin nas cores da marca Sonay (receita, suspender, remover)
- **/cliente?id=** — Tela pública de agendamento via link
- **/cliente?id=&token=** — Tela do cliente para ver/cancelar/remarcar agendamento criado pelo profissional
- **/esqueci-senha** e **/redefinir-senha** — Recuperação de senha (funciona em produção)
- **/auth/confirm** — Route handler PKCE + token_hash para recuperação de senha

### Recursos:
- PWA instalável no celular (ícones, manifest, service worker)
- Validação de senha forte (8+ chars, maiúscula, número, especial, checklist em tempo real)
- RLS no Supabase (cada profissional só vê os próprios dados)
- Admin reconhecido pelo e-mail (sonaydev88@gmail.com)
- Aviso na tela de login orientando clientes a usarem o link
- Profissional pode criar agendamento para o cliente pelo painel e gerar link com token
- Cliente abre o link e pode cancelar ou remarcar o horário sem login
- Edição inline de serviços (nome e duração) no painel do profissional

---

## Banco de dados (Supabase)

### Tabelas:
- **profissionais:** id, nome, nicho, email, telefone, plano (ativo/inadimplente), valor_mensal, vencimento, criado_em
- **servicos:** id, profissional_id (FK), nome, duracao_min
- **horarios_disponiveis:** id, profissional_id (FK), dia_semana, hora_inicio, hora_fim
- **agendamentos:** id, profissional_id (FK), cliente_nome, cliente_telefone, servico, data, hora, status, token, criado_em

### Funções públicas (SECURITY DEFINER) criadas:
profissionais_ativos(), profissional_publico(uuid), servicos_publico(uuid), horarios_publico(uuid), horarios_ocupados(uuid, date), agendamento_publico(uuid), agendar(...), cancelar_agendamento(uuid, uuid), remarcar_agendamento(uuid, uuid, date, time)

### Enum:
- **nicho:** barbearia, salao, estetica, fisioterapia, personal
- **plano:** ativo, inadimplente

---

## Identidade visual da marca
- **Ícone:** folhinha de agenda com letra S + ponto coral
- **Cores:** fundo #15131f (escuro), gradiente #4f46e5→#7c3aed (índigo/roxo), âmbar #fbbf24 (argolas), coral #fb7185 (ponto)
- **Telas internas:** fundo creme #f4f1ea, cards brancos, cor de destaque varia por nicho
- **Nichos e cores:** barbearia laranja (#d4915d), estética rosa (#c97b94), personal azul (#5d9bd4)
- **Arquivos de logo gerados:** icon-192.png, icon-512.png, icon-maskable-512.png, apple-touch-icon-180.png, favicon-32.png, splash-1024.png

---

## Configurações importantes

### Supabase:
- **Site URL:** https://sonay-agenda.vercel.app
- **Redirect URLs:** https://sonay-agenda.vercel.app/auth/confirm
- **Confirm email:** DESATIVADO (profissional entra direto após cadastro)

### Vercel:
- Deploy automático funciona com repositório **público**
- Branch de produção: **master** (push na master → deploy automático)
- Variáveis de ambiente configuradas: NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY

### Git (configurado no projeto):
- Push na master atualiza master E main automaticamente
- Sem Co-Authored-By nos commits (bloqueava a Vercel no plano gratuito)
- user.email configurado para tonzynhooh@gmail.com

---

## Profissionais de teste no banco:
- **studios lindeza** — barbearia — ativo — R$80/mês (tem serviços e horários)
- **sonay fitness** — personal — ativo — R$100/mês (sem serviços ainda)

---

## Próximos passos (pendentes)
1. **Domínio próprio** — agenda.sonay.dev na Vercel (DNS via Hostinger) — só configuração
2. **Lembretes WhatsApp** — n8n + Evolution API lendo tabela agendamentos do Supabase (bot já está no Railway)
3. **Landing page** — página de venda para atrair profissionais
   - Decisão tomada: `/` vira landing, login vai para `/entrar`
   - Seções: Hero → Como funciona (3 passos) → Para quem é (nichos) → Benefícios → Preço → CTA final

---

## Como continuar no Claude Code
```bash
# Na pasta do projeto
cd "C:\Users\welli\programas note-old\SonayAgenda"
claude

# Para subir o servidor local
npm run dev
# Acessa em http://localhost:3000

# Para publicar em produção
git add -A
git commit -m "descrição do que fez"
git push
# A Vercel faz o deploy automático em ~1-2 minutos
```

---

## Arquivos importantes do projeto
- `supabase/schema.sql` — schema completo do banco
- `supabase/functions_publicas.sql` — 8 funções públicas + grants
- `supabase/admin_setup.sql` — coluna valor_mensal + trigger
- `supabase/auth_setup.sql` — configuração de autenticação
- `docs/checklist-producao.md` — checklist de testes em produção
- `.env.local` — chaves do Supabase (NÃO vai pro GitHub)

---

*Atualizado em 06/06/2026 — retome com "retome de onde paramos".*
