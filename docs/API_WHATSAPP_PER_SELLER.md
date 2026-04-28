# PagRecovery — WhatsApp Per-Seller API

API para que cada seller conecte seu proprio WhatsApp na plataforma de recuperacao.
O seller escaneia um QR code gerado pela API e todas as mensagens de recuperacao dos leads dele passam a sair pelo numero dele.

---

## Base URL

```
https://pagrecovery.com/api/partner/v1/sellers/{sellerKey}/whatsapp
```

## Autenticacao

Todas as requisicoes exigem API key no header:

```
Authorization: Bearer sk_live_XXXXXXXXXXXXXXXX
```

A API key pode ser:
- **Global** (acesso a todos os sellers)
- **Scoped** (acesso apenas ao seller vinculado a key)

Se a key for scoped e o `sellerKey` da URL nao corresponder, retorna `403 FORBIDDEN`.

---

## Endpoints

### 1. Conectar WhatsApp (Gerar QR Code)

```
POST /api/partner/v1/sellers/{sellerKey}/whatsapp/connect
```

Cria uma instancia WhatsApp para o seller (se nao existir) e retorna o QR code para escanear.

**Request:**
```bash
curl -X POST https://pagrecovery.com/api/partner/v1/sellers/meu-seller/whatsapp/connect \
  -H "Authorization: Bearer sk_live_XXXXXXXXXXXXXXXX"
```

**Response (200 — QR gerado):**
```json
{
  "ok": true,
  "instance": "seller_meu_seller",
  "status": "pending_qr",
  "qr_code": "data:image/png;base64,iVBORw0KGgo...",
  "connected_phone": null,
  "message": "Scan the QR code with WhatsApp on your phone."
}
```

**Response (200 — Ja conectado):**
```json
{
  "ok": true,
  "instance": "seller_meu_seller",
  "status": "connected",
  "qr_code": null,
  "connected_phone": "5511999999999",
  "message": "WhatsApp already connected."
}
```

**Response (401):**
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Missing or invalid API key. Use Authorization: Bearer sk_live_..."
  }
}
```

**Response (502 — Falha no provider):**
```json
{
  "error": {
    "code": "CONNECTION_FAILED",
    "message": "Evolution API returned 500."
  }
}
```

#### Notas:
- O campo `qr_code` e uma imagem base64 (data URI). Pode ser renderizado diretamente em uma tag `<img>`.
- O QR code expira em ~45 segundos. Apos expirar, chame novamente ou use o endpoint de status.
- Se o seller ja estiver conectado, o endpoint retorna o status atual sem gerar novo QR.

---

### 2. Verificar Status da Conexao

```
GET /api/partner/v1/sellers/{sellerKey}/whatsapp/status
```

Retorna o estado atual da conexao WhatsApp do seller. Se desconectado, tenta reconectar e gerar novo QR automaticamente.

**Request:**
```bash
curl https://pagrecovery.com/api/partner/v1/sellers/meu-seller/whatsapp/status \
  -H "Authorization: Bearer sk_live_XXXXXXXXXXXXXXXX"
```

**Response (200):**
```json
{
  "ok": true,
  "instance": "seller_meu_seller",
  "status": "connected",
  "qr_code": null,
  "connected_phone": "5511999999999",
  "error": null,
  "updated_at": "2026-04-28T01:30:00.000Z"
}
```

#### Status possiveis:

| Status | Descricao |
|--------|-----------|
| `disconnected` | Sem conexao. Precisa gerar QR. |
| `pending_qr` | QR gerado, aguardando scan. |
| `connected` | WhatsApp conectado e operacional. |
| `error` | Erro na conexao. Ver campo `error`. |

---

### 3. Desconectar WhatsApp

```
POST /api/partner/v1/sellers/{sellerKey}/whatsapp/disconnect
```

Desconecta o WhatsApp do seller. O numero fica liberado para conectar em outro lugar.

**Request:**
```bash
curl -X POST https://pagrecovery.com/api/partner/v1/sellers/meu-seller/whatsapp/disconnect \
  -H "Authorization: Bearer sk_live_XXXXXXXXXXXXXXXX"
```

**Response (200):**
```json
{
  "ok": true,
  "instance": "seller_meu_seller",
  "status": "disconnected",
  "message": "WhatsApp disconnected successfully."
}
```

---

## Fluxo de Integracao Recomendado

```
1. POST /whatsapp/connect
   → Recebe QR code (base64)

2. Exibir QR code para o seller no frontend
   → Seller escaneia com WhatsApp

3. GET /whatsapp/status (polling a cada 3-5s)
   → Aguarda status mudar para "connected"

4. Quando status = "connected":
   → Seller esta pronto. Mensagens de recuperacao
     serao enviadas pelo numero dele.
```

### Diagrama

```
Seller abre painel    POST /connect      Plataforma cria instancia
        |                  |              no Evolution API e retorna QR
        |                  |                        |
        |            Exibe QR code                  |
        |                  |                        |
   Seller escaneia    GET /status (polling)          |
        |                  |                        |
        |            status: connected              |
        |                  |                        |
   Pronto! Mensagens   Recuperacao automatica     Mensagens saem
   de recuperacao      via IA pelo numero          pelo numero
   ativas              do seller                   do seller
```

---

## Codigo de Exemplo (Frontend)

### React/Next.js

```tsx
"use client";

import { useState, useEffect } from "react";

export function WhatsAppConnect({ sellerKey, apiKey }: { sellerKey: string; apiKey: string }) {
  const [state, setState] = useState<{
    status: string;
    qrCode: string | null;
    phone: string | null;
  }>({ status: "disconnected", qrCode: null, phone: null });

  const headers = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };

  const base = `/api/partner/v1/sellers/${sellerKey}/whatsapp`;

  async function connect() {
    const res = await fetch(`${base}/connect`, { method: "POST", headers });
    const data = await res.json();
    setState({
      status: data.status,
      qrCode: data.qr_code,
      phone: data.connected_phone,
    });
  }

  async function checkStatus() {
    const res = await fetch(`${base}/status`, { headers });
    const data = await res.json();
    setState({
      status: data.status,
      qrCode: data.qr_code,
      phone: data.connected_phone,
    });
  }

  async function disconnect() {
    const res = await fetch(`${base}/disconnect`, { method: "POST", headers });
    const data = await res.json();
    setState({ status: data.status, qrCode: null, phone: null });
  }

  // Poll while waiting for QR scan
  useEffect(() => {
    if (state.status !== "pending_qr") return;
    const interval = setInterval(checkStatus, 4000);
    return () => clearInterval(interval);
  }, [state.status]);

  if (state.status === "connected") {
    return (
      <div>
        <p>WhatsApp conectado: {state.phone}</p>
        <button onClick={disconnect}>Desconectar</button>
      </div>
    );
  }

  return (
    <div>
      {state.qrCode ? (
        <img src={state.qrCode} alt="QR Code WhatsApp" width={300} height={300} />
      ) : (
        <p>Clique para gerar o QR Code</p>
      )}
      <button onClick={connect}>
        {state.qrCode ? "Gerar novo QR" : "Conectar WhatsApp"}
      </button>
    </div>
  );
}
```

### cURL (teste rapido)

```bash
# 1. Gerar QR
curl -X POST https://pagrecovery.com/api/partner/v1/sellers/seller123/whatsapp/connect \
  -H "Authorization: Bearer sk_live_abc123"

# 2. Checar status
curl https://pagrecovery.com/api/partner/v1/sellers/seller123/whatsapp/status \
  -H "Authorization: Bearer sk_live_abc123"

# 3. Desconectar
curl -X POST https://pagrecovery.com/api/partner/v1/sellers/seller123/whatsapp/disconnect \
  -H "Authorization: Bearer sk_live_abc123"
```

---

## Comportamento de Roteamento

Quando um seller tem WhatsApp conectado:

1. **Mensagens de recuperacao** dos leads desse seller saem pelo numero do seller
2. **Mensagens recebidas** (respostas dos clientes) chegam na plataforma normalmente via webhook
3. Se o seller **desconectar**, as mensagens voltam a sair pelo numero padrao da plataforma (fallback)
4. O **admin** pode ver todas as instancias de sellers no painel admin

---

## Erros Comuns

| Codigo | Causa | Solucao |
|--------|-------|---------|
| 400 | Provider nao e web_api | Admin deve configurar Evolution API em /connect |
| 401 | API key invalida/ausente | Verificar header Authorization |
| 403 | API key nao tem permissao para esse seller | Usar key global ou key do seller correto |
| 502 | Evolution API indisponivel | Verificar se Evolution API esta rodando |

---

## Limites

- Cada seller pode ter **1 instancia** WhatsApp ativa
- O QR code expira em **~45 segundos** (limitacao do WhatsApp Web)
- Recomendamos polling de status a cada **3-5 segundos** durante o scan
- Apos conectar, a sessao persiste ate o seller desconectar manualmente ou o WhatsApp desautorizar o dispositivo

---

## Webhooks de Status (Opcional)

Quando a conexao do seller muda de estado, a plataforma recebe automaticamente os eventos do Evolution API.
Se voces precisarem de webhook de status no lado de voces, podemos configurar um callback adicional.
Avisem o endpoint e configuramos.
