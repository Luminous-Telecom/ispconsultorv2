# Central do Assinante — Documentação

## Visão Geral

A Central do Assinante é um portal self-service acessível publicamente pelos clientes da empresa. Ela permite que o cliente consulte seus contratos, faturas e termos, além de fazer download de PDFs e gerenciar sua própria senha de acesso.

O sistema é **multiloja**: cada empresa cadastrada tem sua própria URL identificada por um **slug** derivado automaticamente do `nome_fantasia` (ou `razao_social` como fallback).

---

## URL de Acesso

```
https://<dominio>/central-assinante/<slug>
```

**Exemplo:** empresa "Minha Internet" → slug `minha-internet`  
**URL:** `https://sistema.minhaempresa.com/central-assinante/minha-internet`

### Geração do slug

O slug é gerado em runtime a partir do `nome_fantasia` da empresa (sem armazenar no banco):

| nome_fantasia | slug gerado |
|---------------|-------------|
| `Minha Internet ISP` | `minha-internet-isp` |
| `Provedor São Paulo` | `provedor-sao-paulo` |
| `NetFiber & Cia` | `netfiber-cia` |

Regras de transformação: normaliza unicode (NFD), converte para minúsculas, substitui caracteres não alfanuméricos por `-`, remove hifens duplicados/extremos.

---

## Fluxo de Autenticação

```
1. Cliente acessa /central-assinante/<slug>
2. Sistema carrega logo e nome da empresa via GET /api/dados-empresa/public/<slug>
3. Cliente informa login (CNPJ ou e-mail, conforme parâmetro) + senha
4. POST /api/central-assinante/<slug>/login
5. Backend retorna token de sessão (válido por 24h)
6. Token armazenado no localStorage do navegador
7. Chamadas subsequentes enviam token via header: Authorization: Bearer <token>
```

O token **não é um JWT** — é um HMAC-SHA256 com expiração embutida:  
`base64url(clienteId:expiracao:hash16chars)`

---

## Método de Login

Configurável por parâmetro de sistema (`central_assinante_metodo_login`):

| Valor | Comportamento |
|-------|--------------|
| `cnpj` (padrão) | Cliente faz login com CNPJ (sem pontuação) + senha |
| `email` | Cliente faz login com e-mail + senha |

A configuração é por empresa (filtrada por `empresa_id`).

---

## API — Rotas Públicas (sem autenticação)

Base: `/api`

### Dados da empresa por slug

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/dados-empresa/public/<slug>` | Retorna logo, nome_fantasia e razao_social da empresa |

**Resposta:**
```json
{
  "success": true,
  "data": {
    "logo": "/arquivos/empresa/logo.png",
    "nome_fantasia": "Minha Internet",
    "razao_social": "Minha Internet LTDA"
  }
}
```

---

### Login

**`POST /api/central-assinante/<slug>/login`**

**Body:**
```json
{
  "login": "12345678000190",
  "senha": "minhasenha"
}
```
> `login` pode ser CNPJ (apenas dígitos) ou e-mail, conforme o parâmetro configurado.

**Resposta de sucesso:**
```json
{
  "success": true,
  "message": "Login realizado com sucesso",
  "data": {
    "token": "MTIzNDU2Nzg5MDoxNzA5...",
    "cliente_id": 42,
    "link": "/central-assinante/minha-internet",
    "cliente": {
      "id": 42,
      "razao_social": "Cliente Exemplo LTDA",
      "nome_fantasia": "Cliente Exemplo"
    }
  }
}
```

**Erros possíveis:**
| Status | Mensagem |
|--------|----------|
| 400 | Dados inválidos |
| 401 | Credenciais inválidas |
| 401 | Senha não cadastrada. Entre em contato com o suporte. |
| 404 | Empresa não encontrada |

---

### Recuperar Senha

**`POST /api/central-assinante/<slug>/recuperar-senha`**

Gera uma senha temporária de 12 caracteres e envia por e-mail para o cliente.

**Body:**
```json
{
  "cnpj": "12345678000190",
  "email": "cliente@exemplo.com"
}
```

**Resposta de sucesso:**
```json
{
  "success": true,
  "message": "Instruções para recuperação de senha foram enviadas para seu email"
}
```

**Erros possíveis:**
| Status | Mensagem |
|--------|----------|
| 401 | CNPJ e Email informados não pertencem ao mesmo cliente |
| 401 | Email não corresponde ao CNPJ informado |
| 401 | CNPJ ou Email incorreto |
| 500 | Servidor de email não configurado |

---

## API — Rotas com Token (Authorization: Bearer)

Estas rotas exigem o token obtido no login, enviado no header:

```
Authorization: Bearer <token>
```

### Buscar dados do cliente

**`GET /api/central-assinante/<slug>/me`**

Retorna todos os dados do cliente: informações cadastrais, contratos, títulos (a pagar, atrasados, pagos) e termos.

**Resposta:**
```json
{
  "success": true,
  "data": {
    "cliente": {
      "id": 42,
      "razao_social": "Cliente Exemplo LTDA",
      "nome_fantasia": "Cliente Exemplo",
      "cpf_cnpj": "12345678000190",
      "email": "cliente@exemplo.com",
      "telefone": "(11) 99999-9999",
      "endereco": "Rua Exemplo",
      "numero": "123",
      "complemento": "Sala 1",
      "bairro": "Centro",
      "cidade": "São Paulo",
      "estado": "SP",
      "cep": "01001-000"
    },
    "contratos": [
      {
        "id": 10,
        "plano": "Plano 100Mbps",
        "valor_final": 99.90,
        "data_inicio": "2024-01-01",
        "data_fim": null,
        "status": "ativo",
        "banco_boleto": "Banco do Brasil"
      }
    ],
    "titulos": {
      "todos": [...],
      "pagos": [...],
      "atrasados": [...],
      "a_pagar": [...]
    },
    "termos": [
      {
        "id": 5,
        "contrato_id": 10,
        "tipo_termo": "adesao",
        "titulo": "Termo de Adesão",
        "conteudo": "...",
        "assinado": "sim",
        "data_aceite": "2024-01-01T10:00:00Z",
        "aceito_por": "Cliente Exemplo"
      }
    ],
    "resumo": {
      "total_contratos": 1,
      "contratos_ativos": 1,
      "total_titulos": 12,
      "titulos_pagos": 10,
      "titulos_atrasados": 1,
      "titulos_a_pagar": 1,
      "valor_total_pago": 998.00,
      "valor_total_atrasado": 99.90,
      "valor_total_a_pagar": 99.90,
      "total_termos": 1,
      "termos_assinados": 1
    }
  }
}
```

---

### Trocar Senha

**`POST /api/central-assinante/<slug>/me/trocar-senha`**

**Body:**
```json
{
  "senhaAtual": "senhaatual",
  "novaSenha": "novasenha123"
}
```

> `novaSenha` deve ter no mínimo 6 caracteres.

---

### Download de PDFs

Todos os endpoints de PDF retornam `Content-Type: application/pdf`.

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/central-assinante/<slug>/me/contrato/:contratoId/pdf` | PDF do contrato |
| GET | `/api/central-assinante/<slug>/me/termo/:termoId/pdf` | PDF do termo |
| GET | `/api/central-assinante/<slug>/me/fatura/:tituloId/pdf` | PDF da fatura/boleto |
| GET | `/api/central-assinante/<slug>/me/recibo/:tituloId/pdf` | PDF do recibo de pagamento |

---

## Rotas Legacy (compatibilidade)

Mantidas para suportar links enviados por e-mail antes da migração multiloja. O token é passado diretamente na URL.

| Método | Rota |
|--------|------|
| GET | `/api/central-assinante/:clienteId/:token` |
| GET | `/api/central-assinante/:clienteId/:token/contrato/:contratoId/pdf` |
| GET | `/api/central-assinante/:clienteId/:token/termo/:termoId/pdf` |
| GET | `/api/central-assinante/:clienteId/:token/fatura/:tituloId/pdf` |
| GET | `/api/central-assinante/:clienteId/:token/recibo/:tituloId/pdf` |

---

## Configuração no Sistema Administrativo

### 1. Senha do cliente

A senha da Central do Assinante é configurada na aba **Contato** do cadastro de cliente.  
O campo `Senha da Central do Assinante` armazena o hash bcrypt da senha.  
Deixar em branco mantém a senha anterior.

### 2. Parâmetros do sistema

| Parâmetro | Chave | Valores | Padrão |
|-----------|-------|---------|--------|
| Método de login | `central_assinante_metodo_login` | `cnpj` / `email` | `cnpj` |

### 3. Servidor de e-mail

A funcionalidade de recuperação de senha exige ao menos um **Servidor de E-mail** ativo cadastrado, filtrado por `empresa_id`.

---

## Segurança

| Mecanismo | Descrição |
|-----------|-----------|
| Rate limiting no login | Previne ataques de força bruta |
| Senha com bcrypt (custo 10) | Hash seguro das senhas |
| Token HMAC-SHA256 com expiração 24h | Token de sessão inviolável |
| Isolamento por empresa_id | Consultas sempre filtradas pela empresa do slug |
| Sem exposição de clienteId na URL | Token armazenado em localStorage, enviado via header |

---

## Diagrama de Fluxo

```
Cliente acessa /central-assinante/minha-empresa
        │
        ▼
GET /api/dados-empresa/public/minha-empresa
→ Carrega logo e nome da empresa
        │
        ▼
Cliente preenche login + senha
        │
        ▼
POST /api/central-assinante/minha-empresa/login
→ Valida empresa (slug), busca cliente por CNPJ/email + empresa_id
→ Verifica senha (bcrypt)
→ Gera token (HMAC-SHA256, 24h)
        │
        ▼
Token armazenado no localStorage
        │
        ▼
GET /api/central-assinante/minha-empresa/me
  Authorization: Bearer <token>
→ Retorna contratos, títulos, termos, resumo
        │
        ▼
Cliente pode:
  ├── Baixar PDF de contrato/termo/fatura/recibo
  ├── Trocar senha
  └── Sair (limpa localStorage)
```
