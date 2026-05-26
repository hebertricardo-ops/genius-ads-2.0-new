# Genius ADS — Documento de Status do Projeto

**Produto:** Genius ADS — Gerador de Criativos com IA
**Repositório:** genius-ads-2.0 (GitHub)
**Supabase Project Ref:** lovhzzlmuhjtbblnstfw
**URL de Produção:** https://adsgenius.com.br
**Última atualização:** 25 de maio de 2026

---

## Stack do Projeto

| Camada | Tecnologia |
|---|---|
| Frontend | React 18 + Vite + TypeScript + Tailwind + Shadcn UI |
| Backend | Supabase Edge Functions (Deno/TypeScript) |
| Banco de dados | Supabase PostgreSQL |
| Autenticação | Supabase Auth + Resend (SMTP) |
| Storage | Supabase Storage |
| IA — Copy | OpenAI (gpt-4o-mini) |
| IA — Imagens | FAL.AI (openai/gpt-image-2/edit) — padrão ativo |
| IA — Imagens (backup) | FAL.AI (fal-ai/nano-banana-pro/edit e fal-ai/nano-banana-2/edit) |
| Email transacional | Resend |
| Pagamentos | Hotmart (checkout externo via URL) |
| Automação de vendas | Make.com (webhook Hotmart → Edge Functions) |
| Publicação social | Upload-Post API (Instagram, Facebook, TikTok) |
| Scraping de sites | Firecrawl API |
| Dev local | VS Code + Claude Code + Bun + Supabase CLI v2.98.2 |
| ZIP de download | JSZip (npm) |

---

## Ambiente de Desenvolvimento

| Item | Status | Detalhe |
|---|---|---|
| Node/Bun instalado | ✅ | Bun — gerenciador preferido (bun.lockb presente) |
| Projeto rodando localmente | ✅ | `bun dev` → http://localhost:8080 |
| Arquivo .env configurado | ✅ | VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY |
| Supabase CLI | ✅ | v2.98.2 |
| Projeto linkado ao Supabase | ✅ | `supabase link --project-ref lovhzzlmuhjtbblnstfw` |

---

## Banco de Dados

Todas as tabelas criadas com RLS ativo — usuário acessa apenas seus próprios dados.

| Tabela | Finalidade | Status |
|---|---|---|
| `profiles` | Dados do usuário (nome, email, whatsapp, avatar_url) | ✅ |
| `user_credits` | Saldo e total usado de créditos por usuário | ✅ |
| `credit_transactions` | Histórico de uso e compra de créditos | ✅ |
| `creative_requests` | Solicitações de criativos estáticos | ✅ |
| `generated_creatives` | Imagens geradas (link storage + copy data + brand_id) | ✅ |
| `carousel_requests` | Solicitações de carrossel com context visual | ✅ |
| `brands` | Marcas cadastradas pelo usuário (com `generated_promise`) | ✅ |
| `plans` | Planos de assinatura com limites de marcas | ✅ |
| `subscriptions` | Assinaturas ativas por usuário | ✅ |
| `content_calendar` | Calendário de postagens com status e agendamento social | ✅ |
| `social_profiles` | Perfil de conexão com redes sociais via Upload-Post | ✅ |
| `creative_edits` | Histórico de edições de criativos via IA (status, result_image_url, edit_element, créditos usados) | ✅ |
| `email_send_log` | Log de todos os emails enviados | ✅ |
| `email_send_state` | Configuração global da fila de email (singleton) | ✅ |
| `suppressed_emails` | Lista de emails suprimidos (bounce/spam/unsub) | ✅ |
| `email_unsubscribe_tokens` | Tokens de descadastro de email | ✅ |

### Funções SQL

| Função | O que faz |
|---|---|
| `handle_new_user()` | Cria registro em `profiles` ao criar usuário |
| `handle_new_user_credits()` | Cria registro em `user_credits` com 4 créditos iniciais |
| `deduct_credits(p_user_id, p_amount)` | Deduz créditos de forma atômica (`UPDATE WHERE credits_balance >= p_amount`); retorna JSONB `{success, new_balance}` ou `{success: false, error}`; `SECURITY DEFINER` — elimina race condition |

### Triggers automáticos em `auth.users`

| Trigger | Função | O que faz |
|---|---|---|
| `on_auth_user_created` | `handle_new_user()` | Cria registro em `profiles` com nome e email do metadata |
| `on_auth_user_created_credits` | `handle_new_user_credits()` | Cria registro em `user_credits` com 4 créditos iniciais |

---

## Banco de Dados — Migrações Recentes

Migrações aplicadas via `supabase db push` após a migração inicial do projeto.

| Arquivo | Data | O que faz |
|---|---|---|
| `20260512233644_create_brands_table.sql` | 12/05/2026 | Cria tabela `brands` com campos de identidade de marca (nome, descrição, logo, cores, etc.) |
| `20260513193642_create_plans_table.sql` | 13/05/2026 | Cria tabela `plans` com planos de assinatura (Free, Pro, Advanced) e seus limites |
| `20260513193648_create_subscriptions_table.sql` | 13/05/2026 | Cria tabela `subscriptions` ligando usuário ao plano ativo |
| `20260513193652_update_user_credits_for_subscriptions.sql` | 13/05/2026 | Ajusta `user_credits` para suportar créditos recorrentes de assinatura |
| `20260513201625_add_brand_limits_to_plans.sql` | 13/05/2026 | Adiciona coluna `max_brands` em `plans` para limitar marcas por plano |
| `20260513201626_add_brand_id_to_generated_creatives.sql` | 13/05/2026 | Adiciona `brand_id` em `generated_creatives` para vincular criativos à marca |
| `20260513201628_add_generated_promise_to_brands.sql` | 13/05/2026 | Adiciona coluna `generated_promise TEXT` em `brands` para cache da promessa gerada por IA |
| `20260519000001_create_content_calendar.sql` | 19/05/2026 | Cria tabela `content_calendar` com campos de título, status, data, plataforma, tipo de conteúdo e referência a criativos |
| `20260519000002_create_social_profiles.sql` | 19/05/2026 | Cria tabela `social_profiles` com username do Upload-Post, plataformas conectadas e status de conexão |
| `20260519000003_add_scheduled_time_to_content_calendar.sql` | 19/05/2026 | Adiciona coluna `scheduled_time TIME` em `content_calendar` (armazenada separadamente do `scheduled_date DATE`) |
| `20260521000000_add_deduct_credits_function.sql` | 21/05/2026 | Cria função SQL `deduct_credits` com `SECURITY DEFINER` para dedução atômica de créditos sem race condition |
| `20260521100000_create_creative_edits_table.sql` | 21/05/2026 | Cria tabela `creative_edits` com RLS, 4 índices e trigger de `updated_at` para rastrear histórico de edições IA |

---

## Storage Buckets

| Bucket | Tipo | Finalidade |
|---|---|---|
| `creative-uploads` | Público | Imagens de produto e logos enviados pelo usuário — logos salvos com `getPublicUrl`, imagens de produto com signed URLs |
| `generated-creatives` | Público | Imagens geradas pela IA (acesso público para exibição) |

> **Atenção:** O bucket `creative-uploads` armazena logos com URL pública. A função `resolveLogoUrl()` em `CreateCarousel.tsx` detecta isso e retorna a URL diretamente sem tentar assinar — logos externos (URLs de scraping) também passam direto.

---

## Edge Functions

### Status de Testes

| Função | Deploy | Status | Observações |
|---|---|---|---|
| `generate-copy` | ✅ | ✅ Funcionando | 3 ângulos + conceito visual + 3 legendas; regra de CTA com exemplos ✅/❌ no system prompt e LEMBRETE CRÍTICO no userPrompt |
| `generate-creative` | ✅ | ✅ Funcionando | Modelo padrão: gpt-image-2/edit; créditos deduzidos de forma atômica via `deduct_credits` RPC após sucesso |
| `edit-creative` | ✅ | ✅ Funcionando | Edição de criativo existente via gpt-image-2/edit; salva histórico em `creative_edits`; 5 créditos por edição |
| `generate-brand-promise` | ✅ | ✅ Funcionando | Gera promessa principal via IA com base na marca |
| `generate-carousel` | ✅ | ✅ Funcionando | Prompt JSON estruturado, logo por posição, retry automático |
| `brand-scrape-website` | ✅ | ✅ Funcionando | Scraping de site via Firecrawl para pré-preenchimento de marca |
| `social-connect` | ✅ | ✅ Funcionando | Gera link de conexão com Upload-Post; redirect_url dinâmico pelo origin |
| `social-publish` | ✅ | ✅ Funcionando | Publica ou agenda post nas redes via Upload-Post; atualiza `content_calendar` |
| `social-status` | ✅ | ✅ Funcionando | Verifica status de um post específico pelo `calendar_entry_id` |
| `social-sync-status` | ✅ | ✅ Funcionando | Sincroniza plataformas conectadas; `social_accounts` é objeto, não array |
| `social-sync-calendar` | ✅ | ✅ Funcionando | Polling de posts agendados; Upload-Post retorna `"completed"` (não `"success"`) |
| `create-user-webhook` | ✅ | ⏳ Aguardando teste | Header atualizado para `Authorization: Bearer` |
| `update-user-credit` | ✅ | ⏳ Aguardando teste | Header atualizado para `Authorization: Bearer` |
| `check-user-exists` | ✅ | ⏳ Aguardando teste | — |
| `process-email-queue` | ✅ | ⏳ Aguardando teste | Migrado de @lovable.dev/email-js para Resend |
| `admin-dashboard` | ✅ | ⏳ Aguardando teste | — |
| `delete-user-refund` | ✅ | ⏳ Aguardando teste | — |

### Secrets configurados

| Secret | Status |
|---|---|
| `FAL_KEY` | ✅ Configurado |
| `OPENAI_API_KEY` | ✅ Configurado |
| `WEBHOOK_SECRET` | ✅ Configurado |
| `RESEND_API_KEY` | ✅ Configurado |
| `UPLOAD_POST_API_KEY` | ✅ Configurado |
| `FIRECRAWL_API_KEY` | ✅ Configurado |

> `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` são injetados automaticamente pelo Supabase.

---

## Funcionalidades Implementadas

| Funcionalidade | Rota / Componente | Status |
|---|---|---|
| Brand Setup — modo manual | `/brand-setup` | ✅ |
| Brand Setup — modo website (scraping via Firecrawl) | `/brand-setup` | ✅ |
| Brand Setup — modo Instagram (placeholder, Apify pendente) | `/brand-setup` | ✅ parcial |
| Contexto global de marca (BrandContext) | `src/contexts/BrandContext.tsx` | ✅ |
| Seletor de marca no sidebar | `AppSidebar.tsx` | ✅ |
| Gerenciador de marcas | `/brands` | ✅ |
| Sistema de assinaturas (planos Free, Pro, Advanced) | `/subscription` | ✅ UI |
| Geração de criativos estáticos | `/create` → `/results/:id` | ✅ |
| Geração de carrossel | `/create-carousel` | ✅ |
| Biblioteca de criativos | `/history` | ✅ |
| Calendário de conteúdo — visão mês | `/calendario` | ✅ |
| Calendário de conteúdo — visão semana | `/calendario` | ✅ |
| Sync automático de status de posts agendados | `social-sync-calendar` + polling 30s | ✅ |
| Publicação e agendamento social (Upload-Post) — segmentado por marca, cada marca tem seus próprios perfis de redes sociais | `social-publish` | ✅ |
| Página de redes sociais | `/social-accounts` | ✅ |
| Conexão de contas sociais (Instagram, Facebook, TikTok) | `social-connect` | ✅ |
| Promessa de marca gerada por IA | `generate-brand-promise` | ✅ |
| Editor de criativo com IA | `/editor/:creativeId` | ✅ |
| Seletor de CTA com presets | `CTASelector.tsx` (compartilhado) | ✅ |
| Autenticação (login, cadastro, confirmação de email) | `/auth`, `/auth-callback` | ✅ |
| Perfil do usuário | `/profile` | ✅ |

---

## Fluxo de Criação de Criativos (Fluxo Principal)

### Wizard "Criar Criativo" — 4 passos

| Passo | Nome | Conteúdo |
|---|---|---|
| 1 | Produto | Nome do produto (pré-preenchido da marca), promessa (gerada por IA), quantidade, estilo visual |
| 2 | Persuasão | Dores, benefícios, objeções (pré-preenchidos da marca quando disponível) |
| 3 | CTA | Call to action (sugestões + campo livre), orientações adicionais |
| 4 | Criar | Geração automática de 3 ângulos de copy ao avançar; seleção de ângulo colapsa os demais |

### Fluxo pós-seleção de ângulo

1. Clicar no card do ângulo → colapsa os outros dois
2. Dentro do card aparecem: botão "Adicionar Imagem" + toggle "Enviar Logo" (se marca tiver logo)
3. "Adicionar Imagem" abre Dialog com upload + campo de orientações por imagem
4. Thumbnails abaixo do card com hover para editar (Pencil) ou remover (X)
5. Seletor de formato (1:1 / 4:5 / 9:16 / 16:9)
6. Botão "Gerar Criativo" → abre Dialog de progresso (não pode ser fechado manualmente)
7. Ao finalizar, navega para `/results/:requestId`

---

## Fluxo de Criação de Carrossel

### Wizard "Novo Carrossel" — 4 passos

| Passo | Nome | Conteúdo |
|---|---|---|
| 1 | Produto | Nome do produto (pré-preenchido da marca), promessa principal (gerada por IA e cacheada), quantidade de slides (4-8, cada um = 10 créditos) |
| 2 | Persuasão | Dores, benefícios, objeções (pré-preenchidos da marca) |
| 3 | Estratégia | Objetivo do carrossel, estilo visual, CTA base, contexto adicional |
| 4 | Criar | Copy gerada automaticamente ao chegar no passo; cards quadrados por slide; botão único "Gerar Carrossel" |

### Fluxo de geração de slides

1. Ao chegar no passo 4, `useEffect` dispara `handleGenerateCopy` automaticamente
2. Usuário visualiza os cards de copy de cada slide (formato quadrado)
3. Cada card tem: número do slide, badge de função, headline, subtexto, CTA
4. Controles por slide: "Adicionar Imagem" (dialog com upload + instrução de uso) e toggle "Criar com IA"
5. Toggle "Criar com IA" desativa automaticamente quando o usuário adiciona imagens ao slide
6. Botão "Gerar Carrossel" → abre Dialog de progresso
7. Slides são gerados sequencialmente; slides que falham são retentados automaticamente (até 3 rodadas)
8. Dialog de progresso mostra: contador X/N, barra de progresso, indicadores por slide, status em tempo real
9. Ao concluir, dialog vira tela de resultados com grid de imagens, botão "Download ZIP" e "Salvar na Biblioteca"

### Regras de geração por slide

| Condição do slide | Comportamento |
|---|---|
| `useAiImage: true`, sem imagens extras | Gerado via IA com instrução de imagem contextual baseada na copy |
| `useAiImage: false`, com imagens extras | Gerado usando as imagens fornecidas pelo usuário + instrução |
| `useAiImage: false`, sem imagens extras | Ignorado — usuário optou por não gerar |

### Logo da marca nos slides

| Posição do slide | Visível na imagem | Nos image_urls |
|---|---|---|
| Slide 1 | ❌ Não (referência de estilo) | ✅ Sim (última posição) |
| Slides 2 até N-1 | ✅ Sim (pequena, discreta, num canto) | ✅ Sim (última posição) |
| Último slide | ❌ Não (referência de estilo) | ✅ Sim (última posição) |

### Retry automático de slides

Após cada rodada de geração, o sistema verifica quais slides falharam e tenta novamente, até 3 rodadas no total. Créditos só são debitados em gerações bem-sucedidas.

---

## Fluxo de Publicação Social

### Conexão de contas

1. Usuário acessa `/social-accounts` e clica em "Conectar redes sociais"
2. `social-connect` gera link de conexão no Upload-Post com `redirect_url` dinâmico
3. Link abre em nova aba (via `window.open("", "_blank")` síncrono antes do await para evitar bloqueio de popup)
4. Após conectar, Upload-Post redireciona para `/social-accounts?connected=true`
5. Página chama `social-sync-status` automaticamente e atualiza as plataformas conectadas

> **Importante:** `social_accounts` na resposta do Upload-Post é um objeto `{ instagram: {...}|"", tiktok: "" }`. Valor não-vazio = plataforma conectada.

### Publicação de post

1. Em `/calendario`, clicar em "Nova Postagem" abre o form
2. Usuário seleciona criativo gerado (dialog de seleção com grid 3 colunas), define legenda, plataforma e horário
3. Ao salvar: entry inserida em `content_calendar`, depois `social-publish` é chamado
4. Upload-Post recebe `image_url`, `caption`, `platforms`, `scheduled_for` (ISO8601 ou null para imediato)
5. `upload_post_request_id` é salvo na entry para polling futuro

### Sync automático de status

- Polling a cada 30s via `social-sync-calendar` enquanto há posts com `status='scheduled'` e data ≤ hoje
- Upload-Post retorna `"completed"` (não `"success"`) para posts publicados — STATUS_MAP corrigido para ambos
- Badge de sync e contador de posts atualizados exibidos no header do calendário

---

## Geração de Imagens — Modelo Ativo

**Modelo padrão:** `openai/gpt-image-2/edit` via fal.ai
**Endpoint:** `https://fal.run/openai/gpt-image-2/edit`
**Parâmetros enviados:** `prompt` (JSON estruturado), `image_urls` (produto + logo), `image_size`, `quality: "medium"`, `num_images`, `output_format: "png"`

**Requisito crítico:** O endpoint `openai/gpt-image-2/edit` exige **pelo menos uma imagem** em `image_urls`. No carrossel, a logo da marca garante isso. No criativo estático, ao menos uma foto de produto é obrigatória.

**Modelos de backup (implementados, não expostos na UI):**
- `fal-ai/nano-banana-pro/edit` — passa `image_urls`, `prompt` como JSON string aninhada, `aspect_ratio`, `resolution: "1K"`
- `fal-ai/nano-banana-2/edit` — igual ao Pro + `limit_generations: true`

Para alternar o modelo basta mudar o `useState("gpt-image-2")` em `CreateCreative.tsx` e `RegenerateCreative.tsx`.

---

## Referência de Prompts

> Ver **[PROMPTS_REFERENCIA.md](./PROMPTS_REFERENCIA.md)** para a documentação completa e de fallback dos prompts de geração de imagem.

Resumo da diferença principal:

| Aspecto | Criativo Estático | Slide de Carrossel |
|---|---|---|
| Texto na imagem | ❌ NÃO (texto sobreposto no frontend) | ✅ SIM (modelo renderiza na imagem) |
| Logo | Proeminente | Pequena e discreta nos slides intermediários |
| Formato | Variável (1:1, 4:5, 9:16, 16:9) | Fixo 1:1 |

---

## Promessa Principal — Geração Automática por Marca

Ao abrir "Criar Criativo" ou "Novo Carrossel" com uma marca selecionada:

1. Se a marca já tem `generated_promise` → preenche o campo imediatamente (sem chamada à API)
2. Se não tem (e tem `description` ou `benefits`) → chama `generate-brand-promise`, preenche o campo e salva no banco
3. Campo fica desabilitado durante a geração com badge `gerando...`
4. Nas próximas aberturas, o texto salvo é reutilizado sem nova chamada

---

## Autenticação e Email

| Item | Status |
|---|---|
| Supabase Auth (login/cadastro) | ✅ |
| Página de confirmação de email | ✅ |
| AuthCallback com PKCE | ✅ |
| Erros de login traduzidos | ✅ |
| Resend configurado no Supabase | ✅ |
| Webhook Make.com pós-cadastro | ✅ |

---

## Fluxo de Pagamento

| Item | Status |
|---|---|
| Gateway | Hotmart (checkout externo) |
| Botões de compra | ⏳ Pendente — adicionar `VITE_HOTMART_CHECKOUT_URL` |
| Webhook Hotmart → Make → Edge Functions | ⏳ Pendente |

---

## Correções e Ajustes Realizados (sessões recentes)

### Fluxo de criação de criativos (CreateCreative + RegenerateCreative)
- Wizard reestruturado para 4 passos: Produto, Persuasão, CTA, Criar
- Upload de imagens movido para após seleção de ângulo de copy (Dialog-based)
- Cards de ângulo colapsam ao selecionar; "Trocar ângulo" desfaz a seleção
- Badge "Selecionado" e ícone Eye removidos
- Geração de copy inicia ao avançar do passo 3 (botão "Próximo" padrão)
- Loading spinner exibido no passo 4 enquanto copies são geradas
- Barra de progresso durante geração de criativo movida para Dialog que fecha automaticamente
- `resetWizard()` também reseta `imageInstructions` e fecha o dialog de imagem

### Tela de resultados (CreativeResults)
- Card "Resumo da Geração" removido
- Seção de legendas removida
- Imagens exibidas em tamanho maior (h-auto object-contain)
- Título "Criativos Gerados" removido
- Botão de publicação social com 3 estados: loading, conectado (publica), desconectado (redireciona para /social-accounts)

### Edge function `generate-creative`
- Prompt totalmente reestruturado para formato JSON estruturado (`buildPrompt`)
- Adicionados campos `promise`, `pains`, `benefits`, `objections` ao prompt
- `instrucoes_extras` dinâmicas: paleta de cores, elementos temáticos, instrução do usuário
- Instrução de headline (30–40% da imagem, cor de destaque em palavras-chave)
- Suporte a `image_instructions` por imagem individual
- Logo enviado via signed URL (regex extrai path do bucket `creative-uploads`)
- Modelos nano-banana corrigidos: endpoint `/edit`, prompt como JSON aninhado, `limit_generations` para nano-banana-2
- `STYLE_DIRECTIVES` removido (estilo vem do conceito visual gerado pela copy)
- Seleção de modelo removida da UI; `imageModel` fixo em `"gpt-image-2"` (nano-banana como backup)

### Edge function `generate-brand-promise` (nova)
- Chama gpt-4o-mini para gerar promessa detalhada baseada em `description` e `benefits` da marca
- Texto com 3–5 frases descrevendo o que o produto faz e como funciona
- Resultado salvo em `brands.generated_promise` para reutilização

### Edge function `brand-scrape-website` (nova)
- Usa Firecrawl API para extrair conteúdo do site da marca
- Retorna campos estruturados para pré-preenchimento do Brand Setup: nome, descrição, benefícios, diferenciais, público-alvo, cores, tom de voz

### Integração de redes sociais (Upload-Post)
- `social-connect`: gera link de conexão com redirect_url dinâmico baseado no `origin` da request
- `social-publish`: publica ou agenda post; salva `upload_post_request_id` na `content_calendar`
- `social-status`: verifica status de um post específico no Upload-Post
- `social-sync-status`: reescrita para interpretar `social_accounts` como objeto (não array); filtra plataformas com valor não-vazio
- `social-sync-calendar`: STATUS_MAP corrigido para incluir `"completed"` (valor real da API) além de `"success"`
- Abertura de links em nova aba via `window.open("", "_blank")` síncrono antes do await

### Calendário de conteúdo (/calendario)
- Form "Nova Postagem" com rádio publicar agora / agendar, time picker, seletor de criativo, legenda (2200 chars)
- Grid de criativos: itens com `height: 200px` fixo para evitar sobreposição
- Card de criativo selecionado com CSS Grid `gridTemplateColumns: "56px 1fr 32px"` para evitar overflow horizontal
- STATUS_CONFIG: ideia=muted, em criação=purple, pronto=blue, agendado=amber, publicado=green
- Opção "video" removida do seletor de tipo de conteúdo
- Polling a cada 30s via `social-sync-calendar` enquanto há posts pendentes
- Indicador de sync e badge de posts atualizados no header
- **Visão de semana**: toggle Mês/Semana, navegação por semana, todos os posts do dia exibidos com horário e ícones de plataforma

### RegenerateCreative
- Alinhado com todos os padrões do CreateCreative
- Upload de imagem apenas após seleção de ângulo
- Mesmo Dialog de progresso e comportamento de collapse
- `InsufficientCreditsDialog` com props corretas (`onClose`, `creditsNeeded`, `creditsAvailable`)

### Edge function `generate-carousel` (múltiplas sessões)
- Prompt migrado de texto plano para JSON estruturado (`buildFalPrompt`) — mesmo formato do criativo
- Sempre usa `openai/gpt-image-2/edit` (fallback flux removido)
- Logo da marca sempre enviada como última imagem de referência em todos os slides
- Instrução de logo visível (pequena e discreta) nos slides 2 até N-1; referência de estilo no slide 1 e último
- Instrução de geração de imagem contextual baseada na copy quando `useAiImage: true`
- Deploy executado via `supabase functions deploy generate-carousel`

### CreateCarousel (múltiplas sessões)
- Wizard de 4 passos: Produto, Persuasão, Estratégia, Criar
- Campo "Imagens de referência" removido do passo 1 (removido após revisão de UX)
- Slides count: 5 botões indicadores (4-8 slides), cada um mostrando custo em créditos
- Auto-geração de copy ao chegar no passo 4 via `useEffect`
- Cards de slide em formato quadrado (`aspect-square`)
- Toggle "Criar com IA" desativa automaticamente quando usuário adiciona imagens ao slide
- Botão único "Gerar Carrossel" (sem botão por slide)
- `resolveLogoUrl()`: detecta URL pública do Supabase e retorna direta (sem signed URL); URLs privadas são renovadas; URLs externas passam diretamente — **bug corrigido** que causava logo undefined
- Filtro de slides para geração corrigido: `(useAiImage || extraImages.length > 0) && !imageUrl` — slides com imagem adicionada pelo usuário eram incorretamente excluídos da geração
- Retry automático: até 3 rodadas; slides que falham são retentados sem cobrar créditos extras
- Dialog de progresso com: contador X/N, barra de progresso, indicadores por slide, status em tempo real por sub-etapa
- Dialog de resultado com grid de imagens, botão "Download ZIP" (JSZip) e "Salvar na Biblioteca"
- Títulos das dialogs sem bold (font-normal)

### CTASelector — componente compartilhado
- Componente `src/components/CTASelector.tsx` com 17 presets organizados em duas categorias:
  - **Conversão direta (6):** Saiba Mais, Cadastro, Contato, Oferta, Compre agora, Agende já
  - **Engajamento orgânico (11):** Curtir, Marcar amigo, Salvar, Comentar, Seguir, Compartilhar e variações
- Input de texto livre no topo + grid de chips de seleção rápida abaixo
- Chip selecionado: `border-primary bg-primary/10 text-primary`
- Aplicado em: `CreateCreative`, `CreateCarousel` e `RegenerateCreative` (substituiu chips inline anteriores)

### Créditos atômicos — Edge Functions de imagem
- **Problema anterior:** `generate-creative` e `generate-carousel` faziam SELECT seguido de UPDATE separados — sujeito a race condition
- **Solução:** Função SQL `deduct_credits(p_user_id, p_amount)` com `SECURITY DEFINER` que executa `UPDATE WHERE credits_balance >= p_amount` em operação única
- Fluxo correto: verificar saldo → gerar → deduzir (apenas após sucesso) → inserir em `credit_transactions`
- **Frontend:** toda lógica de débito de créditos removida das páginas React; apenas `invalidateQueries(["credits"])` permanece

### Dashboard — ajustes visuais
- "Histórico recente" → "Últimas Criações"
- "Ver tudo" → "Ver Biblioteca"
- Card de criativos: `gradient-card border` → `bg-secondary/60` (mais escuro, sem borda interna)
- Botão "Ver Biblioteca": `variant="outline"` → `variant="ghost" border-0`

### Calendário — layout compacto de cards
- `EventCard` com border-l-2 colorida por status, thumbnail 32×32, horário, ícone de plataforma e `StatusBadge`
- Limite de 3 cards por célula; badge "+N mais" para o restante
- `PlatformIcon`: lucide Instagram/Facebook para as plataformas nomeadas; emoji para tiktok/outros
- Cores de borda por status: `idea=gray | draft=purple | ready=blue | scheduled=amber | published=green`
- Campo de horário: substituído `<input type="time">` (AM/PM dependente de locale) por dois `<input type="number">` separados (HH: 0-23 e MM: 0-59) para garantir formato 24h

### History (Biblioteca)
- Badge **"Edição IA"** (roxo com ícone Sparkles) exibido no canto superior esquerdo de criativos gerados via editor IA
- Nome do card de edição exibe o `edit_label` da versão (ex: "Edição 1") em vez do nome do produto
- Botão **"Editar IA"** adicionado no dialog de detalhe (apenas para criativos individuais, não carrosseis) — navega para `/editor/:creativeId` com `imageUrl` e `brandId` via `location.state`
- Redesign completo do dialog de detalhe de criativo: layout single-column, imagem full-width, headline grande, data muted
- Seção de legenda editável: textarea sempre editável, botão "Copiar", botão "Salvar" aparece somente quando há alteração
- Botões de ação: Voltar, Baixar, Adaptar Formato, Regenerar, Excluir — todos em `text-xs px-2.5 h-8`
- "Adaptar Formato": sub-dialog com seletor de formato → gera nova versão via `generate-creative` usando imagem existente como referência
- Navegação prev/next entre criativos com setas
- Agrupamento de carrosseis: slides do mesmo `carousel_request_id` agrupados em um único tile com badge "N slides"
- Dialog de carrossel: grid de slides ordenados por `slide_number`, download individual, botões Fechar/Regenerar/Excluir

### Editor de Criativo com IA (`/editor/:creativeId`)

Página full-screen (sem AppLayout/sidebar) acessível por:
- Botão **"Editar"** em cada card de criativo na tela `/results/:requestId`
- Botão **"Editar IA"** no dialog de detalhe da biblioteca (`/history`)

#### Layout — 3 colunas + rodapé

| Região | Componente | Conteúdo |
|---|---|---|
| Esquerda (w-44) | `ElementsPanel` | Lista de 8 elementos + 5 sugestões contextuais por elemento |
| Centro (flex-1) | `CanvasPanel` | Imagem com zoom (+/-/reset), overlay de loading, label de versão |
| Direita (w-72) | `ChatPanel` | Histórico de mensagens IA/usuário, textarea, botão enviar (Enter) |
| Rodapé | `VersionHistory` | Scroll horizontal de thumbnails 48×48 com borda ativa |

#### Elementos disponíveis
`headline | body | cta | background | font_style | color_palette | image | free`

#### Hook `useCreativeEditor`
- Estado: `messages[]`, `versions[]`, `activeVersionIdx`, `selectedElement`, `isLoading`
- `sendMessage()`: chama `edit-creative` com `source_image_url` da versão ativa; adiciona nova versão ao histórico
- `selectVersion()`: alterna a imagem exibida no canvas sem perder o histórico

#### Botão "Salvar Versão"
- Desabilitado quando `activeVersionIdx === 0` (imagem original — nada editado)
- Ao salvar: insere a imagem editada em `generated_creatives` com `request_id: null` e `copy_data.is_edit: true`
- A imagem aparece na biblioteca como item independente (não agrupado com o criativo original)
- `copy_data` inclui: `is_edit`, `edit_label`, `original_creative_id`

#### Edge Function `edit-creative`
- **Endpoint fal.ai:** `https://fal.run/openai/gpt-image-2/edit`
- **Payload:** `prompt`, `image_urls: [source_image_url]`, `image_size: "square_hd"`, `quality: "medium"`, `num_images: 1`
- **Prompt montado:** `Elemento a editar: {element}. Instrução: {user_message}. Preservar identidade visual...`
- **Custo:** 5 créditos por edição (deduzidos atomicamente via `deduct_credits` RPC)
- **Fluxo:** verificar saldo → insert `creative_edits` (status: processing) → fal.ai → upload Storage → update (status: completed) → deduzir créditos → insert `credit_transactions`

### `social_profiles` vinculado a `brand_id`
- **Problema:** conexão de redes sociais era global por usuário — todas as marcas compartilhavam o mesmo perfil social
- **Correção:** adicionado `brand_id NOT NULL` com `UNIQUE (user_id, brand_id)` — cada marca tem perfis independentes; `social-connect`, `social-sync-status` e `social-publish` filtram por `user_id + brand_id`; `useSocialPublish` e `SocialAccounts` operam sobre a marca ativa do contexto

### Correções de TypeScript
- `setShowImageUpload(false)` removido do `CreateCreative` (estado não existia mais)
- `ad_captions` removido do `copy_data` no insert de `generated_creatives`
- Todos os arquivos mantidos com zero erros de TypeScript após cada sessão

---

## Próxima Sessão — Retomar por aqui

**Ponto de retomada:** Integração de pagamentos e testes em produção

### Pendências conhecidas

| Prioridade | Item |
|---|---|
| 🔴 Alta | Testar webhooks Hotmart (`create-user-webhook`, `update-user-credit`) |
| 🔴 Alta | Conectar botões de compra com `VITE_HOTMART_CHECKOUT_URL` |
| 🔴 Alta | Configurar cenário no Make.com (webhook Hotmart → Edge Functions) |
| 🔴 Alta | Aplicar migrações no banco remoto via `supabase db push` (`deduct_credits` + `creative_edits`) |
| 🟡 Média | Deploy das Edge Functions novas/atualizadas (`edit-creative`, `generate-creative`, `generate-carousel`, `generate-copy`) |
| 🟡 Média | Fluxo Instagram no Brand Setup (Apify — pendente de implementação) |
| 🟡 Média | ElementsPanel oculto em mobile — considerar drawer/bottom-sheet para mobile |
| 🟢 Baixa | Smoke test completo end-to-end em produção (editor IA, biblioteca, calendário) |

---

*Atualizar este documento a cada sessão de desenvolvimento.*
