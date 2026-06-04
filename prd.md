# PRD — AgendaSonay

---

## 1. O que é (em uma frase)
App de agendamento de serviços para profissionais autônomos e pequenos negócios (salão, estética, personal, fisioterapia), com painel para o profissional, link público para o cliente marcar horário e painel de administração para controlar quem usa.

## 2. Problema que resolve
Profissionais autônomos e pequenas empresas perdem clientes e tempo por falta de controle de agenda: marcam duas pessoas no mesmo horário, esquecem compromissos e organizam tudo na mão. O app centraliza horários, evita conflito de marcação e dá ao cliente autonomia para marcar, remarcar e cancelar. Feito para personais, salões, esteticistas, fisioterapeutas e nichos semelhantes.

## 3. Para quem é
- **Administrador (eu, Sonay):** controla quais profissionais usam o sistema e quem está pagando.
- **Profissional (dono do negócio):** gerencia a própria agenda, horários e clientes.
- **Cliente final:** marca, remarca e cancela horário pelo link — sem precisar criar conta.

## 4. O que ele faz (funcionalidades)
- [ ] Profissional cria conta e escolhe o nicho (o nicho define os serviços e a cor)
- [ ] Profissional define seus dias e horários de atendimento
- [ ] Profissional gera um link público para enviar aos clientes
- [ ] Cliente acessa pelo link e marca horário entre os livres, informando nome e telefone (sem login)
- [ ] Cliente remarca (muda data/hora) ou cancela seu horário pelo mesmo link
- [ ] Profissional vê os dias agendados com nome do cliente, telefone, horário e serviço
- [ ] Admin vê todos os profissionais, vencimento do plano, e pode ativar, desconectar e excluir conta

## 5. Telas / áreas
| Tela | Quem acessa | O que faz |
|------|-------------|-----------|
| Cadastro / Login | Profissional e Admin | Criar conta, entrar, ver/ocultar senha, recuperar senha |
| Tela inicial | Profissional | Mostra dados do profissional e informações da empresa |
| Agendamento | Cliente (público, via link) | Vê dias e horários livres, marca, remarca e cancela informando nome e telefone |
| Dias agendados | Profissional | Vê agenda por dia: nome do cliente, telefone, horário, serviço |
| Administração | Admin (só eu) | Lista profissionais, vencimento, ativar/desconectar/excluir conta |

## 6. Dados (o que o sistema guarda)
- **profissionais:** id, nome, nicho, email, telefone, plano (ativo/inadimplente), vencimento, criado_em
- **servicos:** id, profissional_id (FK), nome, duracao_min
- **horarios_disponiveis:** id, profissional_id (FK), dia_semana, hora_inicio, hora_fim
- **agendamentos:** id, profissional_id (FK), cliente_nome, cliente_telefone, servico, data, hora, status (confirmado/cancelado), criado_em

> Observação: o cliente não tem conta nem tabela própria. O nome e o telefone dele ficam direto no agendamento. Esse telefone é o que o bot do WhatsApp vai usar depois para mandar lembrete.

## 7. Regras importantes
- Ninguém pode acessar o login de outra pessoa
- Profissional só vê os próprios dados e agendamentos
- Só o e-mail do admin ([sonaydev88@gmail.com]) acessa a tela de administração
- O nicho escolhido no cadastro define os serviços e a cor do profissional
- Horário já ocupado não aparece como disponível para outro cliente
- A tela de agendamento é pública (acesso por link), mas só permite marcar — não dá acesso a dados de outros clientes nem do profissional
- Dados são sensíveis: tratamento conforme a LGPD (não expor dados pessoais publicamente)

## 8. Fora do escopo (por enquanto)
- Conta/login para o cliente final (cliente só marca pelo link)
- Pagamento online dentro do app (cobrança manual via Pix no início)
- Sessão única / logout automático ao entrar em outro dispositivo (versão futura)
- Lembrete automático via WhatsApp (entra na fase do bot n8n, depois do app no ar)
- Relatórios e gráficos avançados
- App nativo (iOS/Android) — por enquanto é web

## 9. Stack / técnico
- **App:** Next.js + React + Tailwind CSS + TypeScript
- **Banco:** Supabase (banco + autenticação)
- **Hospedagem:** Vercel
- **Integrações:** n8n + Evolution API (bot do WhatsApp que lê e grava na mesma tabela de agendamentos do Supabase). Integração feita depois do app no ar.

## 10. Visual / referência
- **Referência:** prototipo.jsx (arquivo nesta pasta — segue o layout e o fluxo dele)
- **Estilo:** limpo e leve, fundo creme, cabeçalho escuro, cantos arredondados
- **Cores:** fundo #f4f1ea, texto escuro #1a1a1a; cor de destaque muda por nicho — barbearia laranja (#d4915d), estética rosa (#c97b94), personal azul (#5d9bd4)