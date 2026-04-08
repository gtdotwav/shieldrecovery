# Checkout API — Documentacao de Integracao

Base URL: `https://pagrecovery.com/checkout`

---

## Autenticacao

Todas as requisicoes exigem uma chave de API no header:

```
X-API-Key: sk_live_sua_chave_secreta
```

A chave identifica sua conta de merchant. Todos os dados sao automaticamente vinculados ao seu merchant.

Chaves sao criptografadas com SHA-256 e nunca armazenadas em texto puro.

> Solicite sua chave de API com o administrador da plataforma.

---

## 1. Criar Sessao de Checkout

Cria uma sessao de pagamento e retorna uma URL de checkout hospedada. Redirecione o cliente para esta URL.

### Request

```
POST /api/v1/sessions
Content-Type: application/json
X-API-Key: sk_live_...
```

### Body

| Campo | Tipo | Obrigatorio | Descricao |
|-------|------|-------------|-----------|
| `amount` | number | Sim | Valor em reais (ex: `149.90`) |
| `description` | string | Sim | Descricao do produto ou servico |
| `customerName` | string | Sim | Nome completo do cliente |
| `customerEmail` | string | Sim | Email do cliente |
| `customerPhone` | string | Sim | Telefone com DDD (ex: `11999999999`) |
| `customerDocument` | string | Nao | CPF ou CNPJ (somente numeros) |
| `currency` | string | Nao | Moeda ISO 4217 (default: `BRL`) |
| `source` | string | Nao | Origem: `recovery`, `direct`, `api` (default: `api`) |
| `sourceReferenceId` | string | Nao | ID de referencia no seu sistema |
| `allowedMethods` | string[] | Nao | Metodos permitidos: `["pix","card","boleto","crypto"]`. Null = todos habilitados para o merchant |
| `maxInstallments` | number | Nao | Maximo de parcelas permitidas (1-24). Null = regra do provider |
| `interestFree` | boolean | Nao | Forcar parcelas sem juros (`true`) ou com juros (`false`). Null = regra do provider |
| `expiresInMinutes` | number | Nao | Tempo de expiracao em minutos (default: 60) |
| `idempotencyKey` | string | Nao | Chave unica para evitar sessoes duplicadas |
| `metadata` | object | Nao | Dados adicionais em JSON livre |
| `utmSource` | string | Nao | UTM source para tracking |
| `utmMedium` | string | Nao | UTM medium |
| `utmCampaign` | string | Nao | UTM campaign |

### Exemplos

**Basico — todos os metodos habilitados:**

```bash
curl -X POST https://pagrecovery.com/checkout/api/v1/sessions \
  -H "Content-Type: application/json" \
  -H "X-API-Key: sk_live_sua_chave" \
  -d '{
    "amount": 149.90,
    "description": "Curso Marketing Digital",
    "customerName": "Maria Silva",
    "customerEmail": "maria@email.com",
    "customerPhone": "11999887766"
  }'
```

**Somente PIX:**

```bash
curl -X POST https://pagrecovery.com/checkout/api/v1/sessions \
  -H "Content-Type: application/json" \
  -H "X-API-Key: sk_live_sua_chave" \
  -d '{
    "amount": 299.90,
    "description": "Produto X",
    "customerName": "Joao Santos",
    "customerEmail": "joao@email.com",
    "customerPhone": "21988776655",
    "allowedMethods": ["pix"]
  }'
```

**Cartao ate 6x sem juros:**

```bash
curl -X POST https://pagrecovery.com/checkout/api/v1/sessions \
  -H "Content-Type: application/json" \
  -H "X-API-Key: sk_live_sua_chave" \
  -d '{
    "amount": 599.90,
    "description": "Assinatura Premium",
    "customerName": "Ana Costa",
    "customerEmail": "ana@email.com",
    "customerPhone": "31999887766",
    "allowedMethods": ["card"],
    "maxInstallments": 6,
    "interestFree": true
  }'
```

**PIX + Cartao ate 12x com juros:**

```bash
curl -X POST https://pagrecovery.com/checkout/api/v1/sessions \
  -H "Content-Type: application/json" \
  -H "X-API-Key: sk_live_sua_chave" \
  -d '{
    "amount": 1299.90,
    "description": "Mentoria Completa",
    "customerName": "Pedro Lima",
    "customerEmail": "pedro@email.com",
    "customerPhone": "11977665544",
    "allowedMethods": ["pix", "card"],
    "maxInstallments": 12,
    "interestFree": false
  }'
```

**Com idempotencia e metadata:**

```bash
curl -X POST https://pagrecovery.com/checkout/api/v1/sessions \
  -H "Content-Type: application/json" \
  -H "X-API-Key: sk_live_sua_chave" \
  -d '{
    "amount": 450.00,
    "description": "Plano Anual",
    "customerName": "Carlos Oliveira",
    "customerEmail": "carlos@empresa.com",
    "customerPhone": "11988776655",
    "idempotencyKey": "pedido-12345",
    "metadata": {
      "pedidoId": "12345",
      "plano": "anual"
    }
  }'
```

### Response (201 Created)

```json
{
  "sessionId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "shortId": "abc12def",
  "checkoutUrl": "https://pagrecovery.com/checkout/c/abc12def",
  "expiresAt": "2026-04-02T23:59:59.000Z"
}
```

| Campo | Descricao |
|-------|-----------|
| `sessionId` | UUID unico da sessao |
| `shortId` | ID curto para URLs |
| `checkoutUrl` | URL da pagina de checkout — redirecione o cliente para esta URL |
| `expiresAt` | Data/hora de expiracao (ISO 8601) |

### Erros

| Status | Descricao |
|--------|-----------|
| 400 | Campos obrigatorios ausentes ou invalidos |
| 401 | API key invalida ou ausente |
| 429 | Rate limit excedido |
| 500 | Erro interno do servidor |

---

## 2. Consultar Sessao

Retorna o status e detalhes de uma sessao existente.

### Request

```
GET /api/v1/sessions/{id}
X-API-Key: sk_live_...
```

Aceita tanto o `sessionId` (UUID) quanto o `shortId`.

### Exemplo

```bash
curl https://pagrecovery.com/checkout/api/v1/sessions/abc12def \
  -H "X-API-Key: sk_live_sua_chave"
```

### Response (200)

```json
{
  "session": {
    "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "shortId": "abc12def",
    "amount": 14990,
    "currency": "BRL",
    "description": "Curso Marketing Digital",
    "customerName": "Maria Silva",
    "customerEmail": "maria@email.com",
    "customerPhone": "11999887766",
    "status": "paid",
    "source": "api",
    "allowedMethods": ["pix", "card"],
    "maxInstallments": 6,
    "interestFree": true,
    "paidAt": "2026-04-02T15:30:00.000Z",
    "createdAt": "2026-04-02T14:00:00.000Z",
    "expiresAt": "2026-04-02T23:59:59.000Z"
  }
}
```

> **Nota:** O campo `amount` na resposta esta em centavos (14990 = R$ 149,90).

### Status da Sessao

| Status | Descricao |
|--------|-----------|
| `open` | Sessao criada, aguardando cliente abrir o link |
| `method_selected` | Cliente escolheu metodo de pagamento |
| `processing` | Pagamento em processamento |
| `paid` | Pagamento confirmado |
| `failed` | Pagamento falhou (cliente pode tentar novamente) |
| `expired` | Sessao expirou sem pagamento |
| `abandoned` | Cliente abandonou o checkout |

---

## 3. Listar Sessoes

Retorna sessoes do seu merchant com paginacao.

### Request

```
GET /api/v1/merchants/sessions?limit=20&offset=0&status=paid
X-API-Key: sk_live_...
```

| Parametro | Tipo | Descricao |
|-----------|------|-----------|
| `limit` | number | Itens por pagina (default: 20, max: 100) |
| `offset` | number | Deslocamento para paginacao |
| `status` | string | Filtrar por status (opcional) |

### Response (200)

```json
{
  "sessions": [
    {
      "id": "f47ac10b-...",
      "shortId": "abc12def",
      "amount": 14990,
      "status": "paid",
      "customerName": "Maria Silva",
      "createdAt": "2026-04-02T14:00:00.000Z",
      "paidAt": "2026-04-02T15:30:00.000Z"
    }
  ],
  "count": 42
}
```

---

## 4. Estorno (Refund)

Estorna total ou parcialmente uma transacao aprovada.

### Request

```
POST /api/v1/sessions/{id}/refund
Content-Type: application/json
X-API-Key: sk_live_...
```

### Body

```json
{
  "amount": 50.00,
  "reason": "Cliente solicitou cancelamento"
}
```

| Campo | Tipo | Obrigatorio | Descricao |
|-------|------|-------------|-----------|
| `amount` | number | Nao | Valor a estornar em reais. Se omitido, faz estorno total |
| `reason` | string | Nao | Motivo do estorno |

### Response (200)

```json
{
  "refundId": "uuid",
  "status": "processing",
  "amount": 5000,
  "originalAmount": 14990
}
```

---

## 5. Consultar Saldo

Retorna o saldo da sua carteira.

### Request

```
GET /api/v1/merchants/wallet
X-API-Key: sk_live_...
```

### Response (200)

```json
{
  "pendingBalance": 1500.00,
  "availableBalance": 3200.00,
  "totalEarned": 12500.00,
  "totalPaidOut": 7800.00
}
```

| Campo | Descricao |
|-------|-----------|
| `pendingBalance` | Saldo em periodo de retencao (ainda nao liberado) |
| `availableBalance` | Saldo disponivel para saque |
| `totalEarned` | Total recebido desde o inicio |
| `totalPaidOut` | Total sacado |

---

## 6. Consultar Configuracao

Retorna as configuracoes da sua conta.

### Request

```
GET /api/v1/merchants/config
X-API-Key: sk_live_...
```

### Response (200)

```json
{
  "feePercent": 4.99,
  "holdPeriodDays": 14,
  "minPayoutAmount": 50,
  "source": "default"
}
```

| Campo | Descricao |
|-------|-----------|
| `feePercent` | Taxa sobre cada transacao (%) |
| `holdPeriodDays` | Dias de retencao antes do saldo ficar disponivel |
| `minPayoutAmount` | Valor minimo para saque (R$) |

---

## 7. Saques (Payouts)

### Solicitar Saque

```
POST /api/v1/merchants/payouts
Content-Type: application/json
X-API-Key: sk_live_...
```

```json
{
  "amount": 500.00,
  "pixAccountId": "uuid-da-conta-pix-cadastrada"
}
```

### Listar Saques

```
GET /api/v1/merchants/payouts
X-API-Key: sk_live_...
```

---

## 8. Contas PIX

### Listar Contas

```
GET /api/v1/merchants/pix-accounts
X-API-Key: sk_live_...
```

### Cadastrar Conta PIX

```
POST /api/v1/merchants/pix-accounts
Content-Type: application/json
X-API-Key: sk_live_...
```

```json
{
  "pixKeyType": "cpf",
  "pixKey": "12345678900",
  "holderName": "Maria Silva",
  "holderDocument": "12345678900",
  "bankName": "Nubank"
}
```

| pixKeyType | Descricao |
|------------|-----------|
| `cpf` | Chave CPF |
| `cnpj` | Chave CNPJ |
| `email` | Chave email |
| `phone` | Chave telefone |
| `random` | Chave aleatoria |

---

## Webhooks

Configure uma URL de webhook para receber notificacoes em tempo real quando eventos ocorrerem.

### Eventos Disponiveis

| Evento | Descricao |
|--------|-----------|
| `payment.approved` | Pagamento foi confirmado |
| `payment.failed` | Pagamento falhou |
| `payment.refunded` | Estorno foi processado |

### Payload

```json
{
  "event": "payment.approved",
  "data": {
    "sessionId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "shortId": "abc12def",
    "amount": 14990,
    "currency": "BRL",
    "customerName": "Maria Silva",
    "customerEmail": "maria@email.com",
    "paidAt": "2026-04-02T15:30:00.000Z"
  },
  "timestamp": "2026-04-02T15:30:00.000Z"
}
```

> **Nota:** Os webhooks incluem um header `X-Webhook-Signature` para verificacao de autenticidade.

### Boas Praticas

1. Retorne `200` imediatamente ao receber o webhook
2. Processe a logica de negocio de forma assincrona
3. Webhooks que nao retornam `200` serao reenviados automaticamente
4. Valide o header `X-Webhook-Signature` para garantir autenticidade
5. Use o `sessionId` como chave de idempotencia para evitar duplicatas

---

## Metodos de Pagamento

| Metodo | Descricao | Confirmacao |
|--------|-----------|-------------|
| `pix` | PIX instantaneo (QR Code + copia-e-cola) | Instantanea (webhook) |
| `card` | Cartao de credito (ate 24x) | Instantanea |
| `boleto` | Boleto bancario (vence em 3 dias uteis) | 1-3 dias uteis (webhook) |
| `crypto` | Bitcoin, Ethereum, USDC | Variavel (webhook) |

### Pre-selecionar Metodo

Para abrir o checkout com um metodo ja selecionado, adicione `?method=` na URL:

```
https://pagrecovery.com/checkout/c/abc12def?method=pix
```

---

## Controle de Parcelas

Voce pode controlar as opcoes de parcelamento por sessao:

| Parametro | Efeito |
|-----------|--------|
| `maxInstallments: 1` | Somente pagamento a vista |
| `maxInstallments: 6, interestFree: true` | Ate 6x sem juros |
| `maxInstallments: 12, interestFree: false` | Ate 12x com juros (taxa do provider) |
| Sem parametros | Regra padrao do provider |

---

## Fluxo de Integracao

```
1. Sua aplicacao cria uma sessao via API
   POST /api/v1/sessions
        |
        v
2. Recebe a checkoutUrl na resposta
        |
        v
3. Redireciona ou envia o link ao cliente
   (WhatsApp, email, SMS, botao no site)
        |
        v
4. Cliente acessa a pagina de checkout e paga
   (pagina hospedada, responsiva, tema neutro)
        |
        v
5. Webhook notifica seu sistema
   POST sua_url → { event: "payment.approved" }
   OU polling: GET /api/v1/sessions/{id}
        |
        v
6. Saldo aparece na carteira apos periodo de retencao
        |
        v
7. Solicite saque quando disponivel
   POST /api/v1/merchants/payouts
```

---

## Codigos de Erro

Todos os erros retornam JSON no formato:

```json
{
  "error": "Descricao do erro"
}
```

| Status | Descricao |
|--------|-----------|
| 400 | Request invalido ou campos obrigatorios ausentes |
| 401 | API key invalida ou ausente |
| 403 | Sem permissao (conta suspensa) |
| 404 | Recurso nao encontrado |
| 409 | Conflito (sessao ja processada) |
| 429 | Rate limit excedido (max 100 req/min) |
| 500 | Erro interno do servidor |

---

## Rate Limits

- **100 requisicoes por minuto** por API key
- Timeout: 20 segundos por requisicao
- Headers de resposta incluem:
  - `X-RateLimit-Remaining`: requisicoes restantes
  - `X-RateLimit-Reset`: timestamp de reset

---

## Exemplos de Integracao

### Node.js

```javascript
const response = await fetch('https://pagrecovery.com/checkout/api/v1/sessions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': process.env.CHECKOUT_API_KEY,
  },
  body: JSON.stringify({
    amount: 149.90,
    description: 'Produto de Teste',
    customerName: 'Maria Silva',
    customerEmail: 'maria@email.com',
    customerPhone: '11999887766',
    allowedMethods: ['pix', 'card'],
    maxInstallments: 6,
    interestFree: true,
  }),
});

const { checkoutUrl } = await response.json();
// Redirecione o cliente para checkoutUrl
```

### Python

```python
import requests

response = requests.post(
    'https://pagrecovery.com/checkout/api/v1/sessions',
    headers={
        'Content-Type': 'application/json',
        'X-API-Key': CHECKOUT_API_KEY,
    },
    json={
        'amount': 149.90,
        'description': 'Produto de Teste',
        'customerName': 'Maria Silva',
        'customerEmail': 'maria@email.com',
        'customerPhone': '11999887766',
        'allowedMethods': ['pix', 'card'],
        'maxInstallments': 6,
        'interestFree': True,
    },
)

checkout_url = response.json()['checkoutUrl']
# Redirecione o cliente para checkout_url
```

### PHP

```php
$response = json_decode(file_get_contents('https://pagrecovery.com/checkout/api/v1/sessions', false, stream_context_create([
    'http' => [
        'method' => 'POST',
        'header' => implode("\r\n", [
            'Content-Type: application/json',
            'X-API-Key: ' . $apiKey,
        ]),
        'content' => json_encode([
            'amount' => 149.90,
            'description' => 'Produto de Teste',
            'customerName' => 'Maria Silva',
            'customerEmail' => 'maria@email.com',
            'customerPhone' => '11999887766',
        ]),
    ],
])));

$checkoutUrl = $response->checkoutUrl;
// Redirecione o cliente para $checkoutUrl
```

---

## Ambiente

| | URL |
|---|---|
| **Producao** | `https://pagrecovery.com/checkout` |

---

## Suporte

Para duvidas sobre integracao, entre em contato com o administrador da plataforma que forneceu sua API key.
