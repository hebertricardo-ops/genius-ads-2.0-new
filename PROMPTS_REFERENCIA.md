# Genius ADS — Referência de Prompts de Geração de Imagem

> **Finalidade:** Documento de fallback e referência para os prompts de geração de imagem.
> Se qualquer alteração futura no prompt causar degradação na qualidade das imagens,
> use este documento para restaurar o prompt ao estado validado em produção.
>
> **Última validação em produção:** 15 de maio de 2026
> **Endpoint de geração:** `https://fal.run/openai/gpt-image-2/edit` (FAL.AI)
> **Função que monta o prompt:** `buildPrompt()` em `generate-creative/index.ts` e `buildFalPrompt()` em `generate-carousel/index.ts`

---

## 1. Prompt de Geração de Criativo Estático

**Arquivo:** `supabase/functions/generate-creative/index.ts`
**Função:** `buildPrompt(data)`
**Modelo:** `openai/gpt-image-2/edit` via `fal.run`
**Parâmetros enviados ao endpoint além do prompt:** `image_urls` (produto + logo), `image_size` (mapeado por formato), `quality: "medium"`, `num_images`, `output_format: "png"`

### Estrutura do objeto JSON gerado

O prompt é um objeto JSON serializado e enviado como string no campo `prompt` da API.

```json
{
  "tipo": "criativo_publicitario_estatico",
  "formato": "<1:1 | 4:5 | 9:16 | 16:9>",
  "idioma_textos": "português do Brasil",
  "objetivo": "anuncio_meta_ads",
  "produto": {
    "nome": "<product_name>",
    "promessa": "<promise>"
  },
  "conceito_criativo": {
    "angulo": "<headline>",
    "dor_principal": ["<linha 1>", "<linha 2>"],
    "beneficios": ["<linha 1>", "<linha 2>"],
    "objecoes_trabalhadas": ["<linha 1>", "<linha 2>"]
  },
  "imagens_referencia": {
    "instrucao": "usar as imagens fornecidas como base principal da composição, preservando identidade visual e contexto da marca/produto, sempre priorizar layout da marca",
    "logo": "A ÚLTIMA imagem fornecida é o logotipo da marca — deve aparecer na composição final em posição proeminente (ex: topo-esquerda, topo-direita ou centro-inferior). Preservar forma, cores e proporções originais exatamente — não distorcer, recolorir ou cortar.",
    "instrucoes_por_imagem": "imagem 1: <instrução>; imagem 2: <instrução>"
  },
  "layout": {
    "estilo": "<vo.layout_style>",
    "composicao": "<vo.composition>",
    "hierarquia_visual": "<vo.visual_hierarchy>",
    "distribuicao_elementos": "<vo.element_distribution>",
    "destaque_cta": "<vo.cta_highlight>"
  },
  "textos": {
    "headline": "<headline>",
    "subheadline": "<body>",
    "cta": "<cta>"
  },
  "direcao_visual": {
    "descricao": "<vo.visual_description>",
    "atmosfera": "clean premium, conversão alta, estética realista de anúncio para Instagram/Facebook"
  },
  "instrucoes_extras": [
    "manter design clean, premium e informativo",
    "garantir legibilidade em telas mobile",
    "priorizar contraste forte entre elementos principais e fundo",
    "usar as imagens de referência como elementos centrais da composição",
    "não adicionar texto renderizado na imagem; apenas compor o visual",
    "evitar poluição visual e manter acabamento profissional",
    "criar background elaborado com elementos visuais que façam referência ao produto e nicho, evitar fundos de cor única ou gradientes puros — usar texturas, gradientes com inclusão de elementos, padrões ou elementos contextuais",
    "incluir efeitos tecnológicos como linhas geométricas finas, gradientes sutis, elementos em transparência, overlays e formas abstratas que deem um visual moderno e tecnológico ao criativo",
    "a headline deve ocupar de 30% a 40% da área da imagem, com tipografia grande e impactante; aplicar cor de destaque (contraste forte ou cor de acento da paleta) nas palavras ou trechos-chave da headline para criar hierarquia visual e aumentar o impacto",
    "utilizar a seguinte paleta de cores da marca: primária: <hex>, secundária: <hex>, destaque: <hex>",
    "incluir elementos visuais temáticos alinhados ao nicho: <thematic_elements>",
    "orientações adicionais do usuário: <additional_instructions>"
  ]
}
```

### Notas importantes

| Campo | Comportamento |
|---|---|
| `imagens_referencia.logo` | Incluído **somente** quando `has_logo: true` (toggle "Enviar Logo" ativo e marca tem logo_url) |
| `imagens_referencia.instrucoes_por_imagem` | Incluído somente quando o usuário preenche instruções individuais por imagem |
| `instrucoes_extras` — paleta de cores | Incluída somente quando a marca tem `color_primary`, `color_secondary` ou `color_accent` |
| `instrucoes_extras` — thematic_elements | Incluído somente quando `vo.thematic_elements` está preenchido |
| `instrucoes_extras` — additional_instructions | Incluído somente quando o usuário preenche orientações adicionais |
| `instrucoes_extras` — "não adicionar texto" | **Atenção:** O criativo estático NÃO renderiza texto na imagem — o texto é sobreposto via CSS no frontend. Esta instrução é intencional e crítica. |

### Mapeamento de formato para image_size (fal.ai)

| Formato | image_size |
|---|---|
| 1:1 | square_hd |
| 4:5 | portrait_4_3 |
| 9:16 | portrait_16_9 |
| 16:9 | landscape_16_9 |

---

## 2. Prompt de Geração de Slide de Carrossel

**Arquivo:** `supabase/functions/generate-carousel/index.ts`
**Função:** `buildFalPrompt(slide, product_name, creative_style, numSlides, existingSlideUrls?, useAiImage?, imageInstruction?, includeLogoVisible?, hasLogoReference?)`
**Modelo:** `openai/gpt-image-2/edit` via `fal.run`
**Parâmetros enviados ao endpoint além do prompt:** `image_urls` (fotos do produto + slides existentes como referência de estilo + logo sempre por último), `image_size: "square_hd"`, `quality: "medium"`, `num_images: 1`, `output_format: "png"`

### Estrutura do objeto JSON gerado

```json
{
  "tipo": "slide_de_carrossel_publicitario",
  "formato": "1:1",
  "idioma_textos": "português do Brasil",
  "objetivo": "anuncio_meta_ads_carousel",
  "produto": {
    "nome": "<product_name>"
  },
  "slide": {
    "numero": "<slide.slide_number>",
    "total": "<numSlides>",
    "funcao": "<slide.slide_role>"
  },
  "layout": {
    "estilo": "<creative_style | 'clean premium tecnológico'>",
    "composicao": "textos sobrepostos ao visual de forma integrada e hierárquica",
    "hierarquia_visual": "headline dominante, subtexto secundário, cta em destaque",
    "distribuicao_elementos": "headline no terço superior/central, subtexto abaixo, cta no terço inferior"
  },
  "tipografia": {
    "regra_principal": "TODOS os slides do carrossel DEVEM usar EXATAMENTE a mesma fonte/estilo tipográfico — consistência obrigatória",
    "headline": "sans-serif geométrica bold (estilo Montserrat Bold)",
    "subtexto": "sans-serif regular/light (estilo Montserrat Regular)",
    "cta": "mesma família tipográfica do headline, bold ou semibold"
  },
  "textos": {
    "headline": "<slide.headline>",
    "subtexto": "<slide.subtext>",
    "cta": "<slide.cta | null>"
  },
  "direcao_visual": {
    "descricao": "slide <N>/<total> de carrossel publicitário com função \"<slide_role>\"",
    "atmosfera": "clean premium, conversão alta, estética realista de anúncio para Instagram/Facebook"
  },
  "instrucoes_extras": [
    "OBRIGATÓRIO: renderizar os textos (headline, subtexto, cta) diretamente na imagem em português do Brasil com tipografia legível e bem posicionada",
    "a headline deve ter destaque visual: maior, bold, contraste alto, ocupar 30% a 40% da área da imagem; aplicar cor de destaque nas palavras-chave para criar hierarquia visual",
    "o subtexto deve aparecer menor, abaixo do headline",
    "CTA renderizado como botão ou destaque visual",
    "todos os textos EXATAMENTE como fornecidos, sem tradução ou alteração",
    "design clean, premium e profissional",
    "garantir legibilidade em telas mobile",
    "priorizar contraste forte entre elementos principais e fundo",
    "background elaborado com elementos visuais contextuais que façam referência ao produto e nicho — evitar fundos de cor única ou gradientes puros; usar texturas, padrões ou elementos contextuais",
    "incluir efeitos tecnológicos: linhas geométricas finas, gradientes sutis, elementos em transparência, overlays e formas abstratas que deem visual moderno e tecnológico",
    "PROIBIDO: NÃO incluir numeração de slide na imagem (ex: 1/6, 2/8, slide 3 de 5)",
    "PROIBIDO: fontes serifadas, manuscritas, cursivas ou decorativas",

    "REFERÊNCIA DE ESTILO: COPIAR EXATAMENTE a mesma tipografia (font-family, peso, tamanho relativo), paleta de cores, elementos decorativos e composição visual dos slides de referência fornecidos — a fonte deve ser idêntica",

    "visual chamativo e impactante para prender atenção imediatamente",

    "visual de fechamento com destaque máximo para call-to-action",

    "GERAÇÃO DE IMAGEM CONTEXTUAL: além da logomarca, gerar uma imagem fotográfica ou ilustrativa que esteja diretamente alinhada ao contexto da copy deste slide. A imagem deve reforçar visualmente a mensagem do slide e compor o layout de forma integrada. Contexto: produto \"<product_name>\", função do slide \"<slide_role>\", headline \"<headline>\", subtexto \"<subtext>\". A imagem gerada deve ser o elemento visual principal do slide, ocupando uma área de destaque da composição, e deve parecer profissional, realista e adequada para um anúncio no Instagram/Facebook.",

    "instrução específica para uso das imagens de referência: <imageInstruction>",

    "LOGO DA MARCA: a ÚLTIMA imagem fornecida é o logotipo da marca — renderizar de forma PEQUENA e DISCRETA em uma das extremidades do slide (canto inferior direito ou canto inferior esquerdo). Preservar forma, cores e proporções originais exatamente — não distorcer, recolorir ou cortar o logotipo. O logotipo deve ser claramente legível mas não deve competir com o headline ou o conteúdo principal.",

    "LOGO DA MARCA: a ÚLTIMA imagem fornecida é o logotipo da marca — usar APENAS como referência de paleta de cores e identidade visual. NÃO renderizar o logotipo visualmente neste slide."
  ]
}
```

### Notas importantes — instrucoes_extras condicionais

| Instrução | Condição de inclusão |
|---|---|
| `"CTA renderizado como botão..."` | Somente quando `slide.cta` está preenchido |
| `"REFERÊNCIA DE ESTILO..."` | Somente quando `existingSlideUrls?.length > 0` (slides já gerados passados como referência) |
| `"visual chamativo..."` | Somente quando `slide.slide_role === "gancho"` |
| `"visual de fechamento..."` | Somente quando `slide.slide_role === "cta"` |
| `"GERAÇÃO DE IMAGEM CONTEXTUAL..."` | Somente quando `useAiImage === true` (toggle "Criar com IA" ativo) |
| `"instrução específica para uso das imagens..."` | Somente quando `imageInstruction` está preenchido |
| `"LOGO DA MARCA: renderizar..."` | Somente quando `includeLogoVisible === true` (slides 2 até N-1) |
| `"LOGO DA MARCA: usar APENAS como referência..."` | Somente quando `hasLogoReference === true` e `includeLogoVisible !== true` (slide 1 e último slide) |

### Regra de posicionamento da logo nos slides

| Posição do slide | Logo visível na imagem | Logo nos image_urls |
|---|---|---|
| Slide 1 (gancho) | ❌ Não (referência de estilo apenas) | ✅ Sim (sempre última) |
| Slides intermediários (2 até N-1) | ✅ Sim (pequena, discreta, num canto) | ✅ Sim (sempre última) |
| Último slide (CTA) | ❌ Não (referência de estilo apenas) | ✅ Sim (sempre última) |

### Ordem dos image_urls enviados ao endpoint

```
[ ...fotos_do_produto, ...extra_images_do_slide, ...slides_já_gerados (até 2), logo_da_marca ]
```

A logo é **sempre a última** — o prompt a referencia como "a ÚLTIMA imagem fornecida".

---

## 3. Diferença crítica entre os dois prompts

| Aspecto | Criativo Estático | Slide de Carrossel |
|---|---|---|
| Texto na imagem | ❌ NÃO — texto é sobreposto no frontend via CSS | ✅ SIM — modelo renderiza headline, subtexto e CTA diretamente na imagem |
| Logo | Proeminente (topo ou centro-inferior) | Pequena e discreta (canto inferior) — exceto slide 1 e último |
| Formato | Variável (1:1, 4:5, 9:16, 16:9) | Fixo 1:1 (square_hd) |
| Conceito visual | Vem do objeto `visual_option` gerado pela copy (layout_style, composition, etc.) | Determinado pelo `creative_style` e função do slide |
| Imagem contextual adicional | Via imagens de produto enviadas pelo usuário | Via `useAiImage: true` (IA gera baseada na copy do slide) |

---

## 4. Histórico de versões do prompt

| Data | Versão | Alteração |
|---|---|---|
| 15 mai 2026 | v1.0 — Criativo | Prompt reestruturado para formato JSON; instrução de headline 30-40%; paleta de cores dinâmica; thematic_elements |
| 15 mai 2026 | v1.0 — Carrossel | Prompt migrado de texto plano para JSON estruturado; alinhado ao formato do criativo; instrução de logo por posição de slide; GERAÇÃO DE IMAGEM CONTEXTUAL quando useAiImage=true |
