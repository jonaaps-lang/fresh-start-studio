# ERP Express Print 2026 — Plano de Construção

Sistema grande (11 módulos + automações + PDFs + autenticação). Não cabe em uma única entrega de qualidade. Proponho construir em fases, começando pela fundação visual + backend e os módulos de uso diário, e evoluindo a partir daí.

## Stack
- Frontend: TanStack Start + React + Tailwind v4 + shadcn/ui
- Backend: **Lovable Cloud** (PostgreSQL + Auth + Storage + Functions) — habilitarei antes de qualquer módulo com dados
- PDFs: geração client-side (jsPDF/pdf-lib) usando dados de Configurações
- Tema: claro/escuro persistido, paleta CMYK (Ciano #00AEEF, Magenta #EC008C, Amarelo #FFF200, Preto #1E1E1E) sobre base preto/branco, com verde escuro como acento institucional opcional

## Identidade visual
- Layout inspirado em Tiny/Bling/Omie: sidebar recolhível, topbar com busca global, toggle de tema, cards arredondados, sombras suaves, ícones Lucide
- Tokens semânticos em `src/styles.css` (oklch), variantes shadcn — sem cores hardcoded em componentes
- CMYK usado como destaque em status, gráficos, KPIs — não como fundo dominante

## Fases

### Fase 1 — Fundação
- [x] Lovable Cloud + design system CMYK claro/escuro com toggle persistente
- [x] Auth (login/cadastro, primeiro usuário vira admin)
- [x] Layout: sidebar recolhível + topbar + 11 rotas com placeholders
- [x] Schema: `profiles`, `user_roles` + `has_role`, `company_settings` + RLS
- [x] Storage bucket `company-assets` para logotipo
- [x] Módulo **Configurações** completo (empresa, endereço, contato, padrões de PDF, logo, cor primária)
- [ ] Módulo **Clientes** (PF/PJ) — CRUD
- [ ] Módulo **Fornecedores** — CRUD
- [ ] Dashboard com indicadores reais + gráficos

### Fase 2 — Comercial
- Orçamentos completo (itens, status, PDF profissional com dados da empresa, WhatsApp, e-mail, duplicar, aprovar → converter em Pedido)
- Pedidos (vindos de orçamento aprovado, status, NF-e manual, rastreio, PDF)
- Automações: data de envio, data de alteração, conversão orçamento→pedido, criação automática de OP, lançamento financeiro

### Fase 3 — Operacional
- Produção (Kanban por status)
- Estoque (entradas/saídas, mínimo, valor médio)
- Compras (gera entrada de estoque + conta a pagar)

### Fase 4 — Financeiro
- Contas a Receber / a Pagar
- Despesas (categorias)
- Fluxo de Caixa automático

### Fase 5 — Integrações futuras
- WhatsApp, N8N, API de NF-e, integração com site/e-commerce Hostinger

## Detalhes técnicos
- Roles via tabela `user_roles` + função `has_role` (segurança)
- Todos os PDFs leem `company_settings` para logo/dados/rodapé
- RLS em todas as tabelas; `service_role` para edge functions
- Numeração automática de orçamento/pedido/compra via sequence no Postgres
- Validação com Zod em todos os formulários

## O que pedirei depois de aprovar este plano
Antes de iniciar a Fase 1, só uma confirmação:
- A cor de acento principal: mantenho **CMYK puro** (Ciano como primário) conforme a seção “Identidade Visual” mais recente, **OU** mantenho o **Verde Escuro** do início do briefing como primário e uso CMYK só em status/gráficos? Os dois trechos do briefing se contradizem.

Confirmando isso, começo pela Fase 1.