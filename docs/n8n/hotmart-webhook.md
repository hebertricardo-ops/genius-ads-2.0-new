# Integração Hotmart → N8N → Genius ADS

## Visão geral do fluxo

```
Hotmart Webhook → N8N
  └─ check-user-exists   → usuário existe?
       ├─ Sim → update-hotmart-user  (atualiza plano ou adiciona créditos)
       └─ Não → create-hotmart-user  (cria usuário + envia email de boas-vindas)
```

---

## Autenticação

Todos os endpoints exigem:

```
Authorization: Bearer <WEBHOOK_SECRET>
```

O `WEBHOOK_SECRET` é uma variável de ambiente configurada no Supabase.  
Também aceito via header `x-webhook-secret` (retrocompatibilidade).

---

## Endpoints

### Base URL
```
https://lovhzzlmuhjtbblnstfw.supabase.co/functions/v1
```

---

### 1. `POST /check-user-exists`

Verifica se um email já possui conta no Genius ADS.

**Request:**
```json
{ "email": "usuario@exemplo.com" }
```

**Response — usuário existe:**
```json
{
  "exists": true,
  "user_id": "uuid",
  "email": "usuario@exemplo.com",
  "credits_balance": 500
}
```

**Response — usuário não existe:**
```json
{ "exists": false }
```

---

### 2. `POST /create-hotmart-user`

Cria um novo usuário com email confirmado, assinatura ativa e envia email de boas-vindas com link para criar senha.

**Request:**
```json
{
  "email":                  "usuario@exemplo.com",
  "name":                   "João Silva",
  "plan":                   "PLANO MENSAL PRO",
}
```

**Campos obrigatórios:** `email`, `plan`  
O `billing_cycle` é derivado automaticamente do nome do plano (MENSAL → monthly, ANUAL → annual).

**Response:**
```json
{
  "success": true,
  "user_id": "uuid",
  "message": "Usuário criado e email enviado"
}
```

---

### 3. `POST /update-hotmart-user`

Atualiza o plano de um usuário existente OU adiciona créditos extras.

**Request — atualização de plano:**
```json
{
  "email":                  "usuario@exemplo.com",
  "plan":                   "PLANO ANUAL ADVANCED",
}
```

**Request — créditos extras:**
```json
{
  "email": "usuario@exemplo.com",
  "plan":  "PACOTE PLUS"
}
```

**Campos obrigatórios:** `email`, `plan`  
O `billing_cycle` é derivado automaticamente do nome do plano.

**Response:**
```json
{
  "success": true,
  "message": "Plano e créditos atualizados"
}
```

---

## Valores válidos para o campo `plan`

O campo `plan` recebe exatamente o nome do produto como cadastrado na Hotmart.  
O `billing_cycle` é derivado automaticamente — não precisa ser enviado.

| Valor exato (case-insensitive) | Slug interno | Billing cycle | Créditos |
|---|---|---|---|
| `PLANO MENSAL PRO` | `pro` | monthly | 500/mês |
| `PLANO MENSAL ADVANCED` | `advanced` | monthly | 1000/mês |
| `PLANO MENSAL SOCIAL MEDIA` | `social-media` | monthly | 2000/mês |
| `PLANO ANUAL PRO` | `pro` | annual | 500/mês |
| `PLANO ANUAL ADVANCED` | `advanced` | annual | 1000/mês |
| `PLANO ANUAL SOCIAL MEDIA` | `social-media` | annual | 2000/mês |
| `PACOTE BASICO` | `creditos-pro` | one-time | +500 |
| `PACOTE PLUS` | `creditos-plus` | one-time | +1000 |

---

## Cenário N8N — Compra Hotmart

```
[Hotmart Trigger]
    │
    ▼
[HTTP Request] POST /check-user-exists
    │  body: { email }
    │  header: Authorization: Bearer <WEBHOOK_SECRET>
    │
    ├─ exists = false
    │       ▼
    │  [HTTP Request] POST /create-hotmart-user
    │       body: { email, name, plan, billing_cycle, hotmart_transaction_id }
    │
    └─ exists = true
            ▼
       [HTTP Request] POST /update-hotmart-user
            body: { email, plan, billing_cycle, hotmart_transaction_id }
```

### Mapeamento de campos Hotmart → N8N

| Campo Hotmart | Campo Genius ADS |
|---|---|
| `data.buyer.email` | `email` |
| `data.buyer.name` | `name` |
| `data.product.id` → mapeado | `plan` |
| `data.subscription.plan.recurrencyPeriod` | `billing_cycle` |
| `data.purchase.transaction` | `hotmart_transaction_id` |

---

## Variáveis de ambiente necessárias (Supabase)

| Variável | Descrição |
|---|---|
| `WEBHOOK_SECRET` | Segredo compartilhado com o N8N |
| `RESEND_API_KEY` | API key do Resend para envio de emails |
| `SITE_URL` | URL do app (ex: `https://app.adsgenius.com.br`) |
| `SUPABASE_URL` | URL do projeto Supabase (automática) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (automática) |
