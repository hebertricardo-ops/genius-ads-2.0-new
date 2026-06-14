# Genius ADS — Documento de Status do Projeto

**Produto:** Genius ADS — Gerador de Criativos com IA
**Repositório:** genius-ads-2.0 (GitHub)
**Supabase Project Ref:** lovhzzlmuhjtbblnstfw
**URL de Produção:** https://adsgenius.com.br
**Última atualização:** 13 de junho de 2026

---

## Stack do Projeto

| Camada | Tecnologia |
|---|---|
| Frontend | React + Vite + TypeScript + Tailwind CSS + shadcn/ui |
| Roteamento | React Router v6 |
| Estado assíncrono | TanStack Query (React Query) |
| Backend | Supabase (Auth + PostgreSQL + Edge Functions + Storage) |
| IA — Copy | OpenAI gpt-4.1-mini |
| IA — Imagens | FAL.AI (fal.run/openai/gpt-image-2/edit) |
| Email | Resend API direta (domínio adsgenius.com.br) |
| Pagamentos | Hotmart (checkout externo) |
| Automação | N8N (Hotmart → Genius ADS) |
| Redes sociais | Upload-Post (publicação + analytics) |
| Scraping web | Firecrawl |
| Scraping Instagram | Apify |
| Dev local | VS Code + Claude Code + Bun + Supabase CLI v2.90.0 |

---

## Ambiente de Desenvolvimento

| Item | Status |
|---|---|
| Bun instalado | ✅ |
| Projeto rodando localmente | ✅ `bun dev` → http://localhost:8080 |
| .env configurado | ✅ VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY |
| Supabase CLI | ✅ v2.90.0 |
| Projeto linkado ao Supabase | ✅ ref lovhzzlmuhjtbblnstfw |

---

## Planos

| Plano | Mensal | Anual | Créditos | Marcas | Perfis sociais | Calendar/Social/Analytics |
|---|---|---|---|---|---|---|
| FREE | R$0 | — | 60 | 2 | — | ❌ |
| PRO | R$59,90 | R$539,10 | 500 | 4 | — | ❌ |
| Advanced | R$99,90 | R$899,10 | 1.000 | 10 | 2 | ✅ |
| Social Media | R$199,90 | R$1.799,10 | 2.000 | Ilimitado | 6 | ✅ |

**Créditos:** 10 por criativo/slide · 6 por edição IA · 6 por adaptar formato
**Pacotes extras:** creditos-pro (+500 R$59,90) · creditos-plus (+1000 R$79,90)
**Pacotes sociais:** SOCIAL PRO (+10 perfis R$144,00) · SOCIAL PLUS (+20 perfis R$275,00)

---

## Banco de Dados — Tabelas

| Tabela | Finalidade |
|---|---|
| `profiles` | Dados do usuário (nome, email, whatsapp, avatar_url) |
| `user_credits` | Saldo, créditos de assinatura e extras |
| `credit_transactions` | Histórico de créditos |
| `plans` | Planos disponíveis com features e limites |
| `subscriptions` | Assinatura ativa por usuário |
| `brands` | Marcas configuradas por usuário |
| `creative_requests` | Solicitações de criativos |
| `generated_creatives` | Imagens geradas (com campo source: generated/adapt_format/edit_ia) |
| `creative_edits` | Histórico de edições via Editor IA |
| `carousel_requests` | Solicitações de carrossel |
| `social_profiles` | Perfis sociais por marca (Upload-Post) |
| `social_posts` | Posts publicados/agendados |
| `content_calendar` | Calendário de postagens |
| `media_uploads` | (estrutura criada — aguarda Supabase Pro) |
| `user_storage` | (estrutura criada — aguarda Supabase Pro) |
| `email_send_log` | Log de emails enviados |
| `suppressed_emails` | Emails suprimidos |

### Funções SQL
- `deduct_credits(user_id, amount)` → dedução atômica
- `add_credits(user_id, amount)` → adição de créditos
- `handle_new_user()` → cria profile com nome, email, whatsapp, avatar
- `handle_new_user_credits()` → 4 créditos iniciais
- `handle_updated_at()` → trigger de updated_at

---

## Secrets configurados (Edge Functions)

| Secret | Status |
|---|---|
| FAL_KEY | ✅ |
| OPENAI_API_KEY | ✅ |
| WEBHOOK_SECRET | ✅ |
| RESEND_API_KEY | ✅ |
| FIRECRAWL_API_KEY | ✅ |
| APIFY_API_KEY | ✅ |
| UPLOAD_POST_API_KEY | ✅ |
| SITE_URL | ✅ |
| N8N_WEBHOOK_URL | ✅ |

---

## Edge Functions deployadas

| Função | Finalidade |
|---|---|
| `generate-copy` | 3 ângulos de copy + legenda (gpt-4.1-mini) |
| `generate-creative` | Imagem estática (gpt-image-2) |
| `generate-carousel` | Pipeline 3 fases + swipe indicator + legenda |
| `edit-creative` | Edição via chat IA (6 créditos, aspect-ratio preservado) |
| `format-idea` | Formata ideia do usuário antes da geração |
| `brand-scrape-website` | Firecrawl + branding + OpenAI Vision fallback |
| `brand-scrape-instagram` | Apify + OpenAI para dados da marca |
| `social-connect` | Upload-Post OAuth por marca |
| `social-publish` | Publica/agenda (suporta carrossel multi-imagem) |
| `social-status` | Status de post no Upload-Post |
| `social-sync-status` | Sincroniza is_connected por marca |
| `social-sync-calendar` | Atualiza status de posts agendados |
| `get-analytics` | Métricas Upload-Post por marca e período |
| `send-support-email` | Formulário de suporte via Resend |
| `send-reset-password-email` | Recovery link via Resend |
| `send-confirmation-email` | Confirmação de cadastro free via Resend |
| `check-user-exists` | Verifica email (uso interno N8N) |
| `check-email-available` | Verifica email disponível (frontend, pública) |
| `check-whatsapp-available` | Verifica WhatsApp disponível (frontend, pública) |
| `create-hotmart-user` | Cria usuário Hotmart + magic link + email boas-vindas |
| `update-hotmart-user` | Atualiza plano/créditos/subscription (N8N) |
| `notify-new-user` | Repassa webhook de novo cadastro ao N8N (evita CORS) |

---

## Funcionalidades Implementadas

### Core de Geração
- Geração de criativos estáticos (10 créditos)
- Geração de carrosséis com IA (10 créditos/slide)
- Seleção de objetivo (engajamento/venda)
- Método "Criar do Zero" ✅
- Método "A partir de uma Ideia" ✅
- Método "A partir de um Link" ⏳ pendente
- Editor de criativos com IA — chat + histórico de versões (6 créditos)
- Adaptar formato de criativo (6 créditos)
- Legenda única gerada para criativos e carrosséis
- Indicador de swipe nos slides de carrossel
- Campo `source` em generated_creatives (generated/adapt_format/edit_ia)

### Marcas
- Brand Setup (manual, website via Firecrawl, Instagram via Apify)
- Contexto global de marca (BrandContext)
- Seletor de marca no sidebar
- Gerenciador de marcas (/brands)
- Limite de marcas por plano (PRO: 4, Advanced: 10, Social Media: ilimitado)

### Redes Sociais
- Publicação e agendamento via Upload-Post (segmentado por marca)
- Desconexão de redes sociais com liberação de licença
- Calendário de postagens com sync automático de status
- Agendamento com horário no calendário
- Publicação de carrossel com múltiplas imagens
- Página /social-accounts com status por plataforma

### Analytics
- Painel de analytics via Upload-Post API
- KPI cards (seguidores, alcance, impressões, engajamento)
- Gráfico de alcance diário
- Score de engajamento ponderado por post
- Disponível apenas para Advanced e Social Media

### Autenticação e Segurança
- Login/cadastro email+senha
- Login com Google OAuth
- Confirmação de email via Resend (template customizado)
- Recuperação de senha via Resend (magic link)
- Anti-abuso Camada 1:
  - WhatsApp como identificador único (constraint UNIQUE)
  - check-email-available (Edge Function pública)
  - check-whatsapp-available (Edge Function pública)
  - EmailExistsDialog e WhatsappExistsDialog (UX melhorada)
- Webhook N8N via Edge Function notify-new-user (sem CORS)

### Monetização
- Sistema de planos com gate de features (usePlan hook)
- UpgradeDialog para calendar, social, analytics, brands, media_upload
- Fluxo Hotmart → N8N → Genius ADS documentado
- Edge Functions create-hotmart-user e update-hotmart-user
- Pacotes de créditos extras e perfis sociais

### UX/UI
- Suporte segmentado (email para PRO, WhatsApp para Advanced+)
- Página de boas-vindas (/welcome) pós-cadastro
- Pixel Meta: PageView (landing), InitiateCheckout (Hotmart), CadastroRealizado (email-confirmation)
- Layout padronizado nas dialogs da biblioteca
- CTASelector com 11 opções pré-definidas
- Histórico de edições carregado do banco no Editor IA

### Mobile — Melhorias (jun/2026)
- `/create-select` redesenhado: grid 2 colunas (mobile empilhado, desktop lado-a-lado), cards ilustrados com badge IA, cores laranja/roxo, sem bordas
- Onboarding em 2 etapas: (1) Welcome Dialog modal com logo bloqueante para usuários sem marca; (2) OnboardingDashboardDialog exibido 800ms após criar primeira marca
- `BrandExistsDialog` — "Usar outro nome" navega de volta ao step de nome no BrandSetup
- `BrandSetup` — cards de método com inputs inline (website/Instagram); sem botão "Continuar" separado; navegação direta ao clicar
- `AppSidebar` — seletor de marca abre para baixo (`side="bottom"`) no mobile
- `AppSidebar` — sidebar fecha automaticamente ao navegar via `useEffect` em `location.pathname` (cobre NavLinks, dropdowns, itens de upgrade)
- `Stepper` — tamanhos responsivos (`w-7 h-7 md:w-9 md:h-9`, gaps menores no mobile)
- `CreativeEditor` — layout com abas no mobile ("🖼️ Criativo" / "💬 Editar com IA") para evitar overflow horizontal
- `History` dialogs — containment de largura (`w-[calc(100vw-2rem)]`), `overflow-x-hidden`, `flex-wrap` nos botões de ação, `break-words` no headline
- `SocialAccounts` — botão "Desconectar" não vaza horizontalmente (flex-wrap + ml-auto no grupo de status)
- `index.css` — `font-size: 16px !important` em inputs/textarea/select no mobile (previne zoom automático iOS)
- `index.css` — `min-height: 100dvh` / `height: 100dvh` via `@supports` (previne compressão pelo teclado virtual)

---

## Rotas do Frontend

| Rota | Página | Auth |
|---|---|---|
| / | Index (landing + planos) | Pública |
| /auth | Auth (login/cadastro) | Pública |
| /signup | SignUp | Pública |
| /auth/callback | AuthCallback | Pública |
| /email-confirmation | EmailConfirmation | Pública |
| /welcome | Welcome | Pública |
| /change-password | ChangePassword | Protegida |
| /dashboard | Dashboard | Protegida + sidebar |
| /create-select | CreateSelect | Protegida + sidebar |
| /create | CreateCreative | Protegida + sidebar |
| /create-carousel | CreateCarousel | Protegida + sidebar |
| /editor/:id | CreativeEditor | Protegida (sem sidebar) |
| /history | History (biblioteca) | Protegida + sidebar |
| /brands | BrandsManager | Protegida + sidebar |
| /brands/new | BrandSetup | Protegida + sidebar |
| /social-accounts | SocialAccounts | Protegida + sidebar |
| /analytics | Analytics (Advanced+) | Protegida + sidebar |
| /calendario | Calendario (Advanced+) | Protegida + sidebar |
| /support | Support | Protegida + sidebar |
| /subscription | Subscription | Protegida + sidebar |
| /profile | Profile | Protegida + sidebar |
| /admin | Admin | Protegida |

---

## Pendências para Lançamento Completo

### Concluído
- ✅ Deploy frontend em produção (Hostinger)
- ✅ Conectar botões de compra com URL do Hotmart na landing page
- ✅ Configurar cenário N8N para Hotmart → Genius ADS
- ✅ Banner WhatsApp para usuários Google — não necessário

### Alta prioridade

### Média prioridade
- [ ] Camada 2 anti-abuso: captura de IP no cadastro como sinal de alerta
- [ ] Camada 3 anti-abuso: bloqueio de email descartável
- [ ] Testes end-to-end do fluxo de assinatura Hotmart

### Melhorias futuras (aguardando crescimento)
- [ ] Upload de Mídia Própria (aguarda Supabase Pro)
- [ ] SMS OTP Twilio (aguarda 20+ usuários ativos)
- [ ] Analytics avançado com Apify (top posts, mix de conteúdo)
- [ ] Método de criação A partir de um Link (URL → Apify scraping → preencher formulário) ⏳ pendente

---

## Documentação auxiliar

| Arquivo | Conteúdo |
|---|---|
| `docs/n8n/hotmart-webhook.md` | Fluxo Hotmart → N8N → Genius ADS |
| `docs/make/create-user-webhook.md` | Payload create-user-webhook (legado Make) |
| `docs/make/update-user-credit.md` | Payload update-user-credit (legado Make) |
| `docs/features/brand-setup.md` | Spec completa do Brand Setup |
| `docs/features/creative-editor.md` | Spec completa do Editor de Criativos |
| `docs/features/analytics.md` | Spec completa do Analytics |

---

*Atualizar este documento a cada sessão de desenvolvimento.*
