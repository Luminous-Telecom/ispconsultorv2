# Integração Typebot ↔ BackNet (URLs atuais)

## Visão Geral

Integração do Typebot com o BackNet usando as rotas **existentes** da API. É necessário ter o **token de API** gerado em **Parâmetros** → **Usuários** → **Gerar token**.

> **Nota:** No Typebot não existe bloco "Webhook" separado — todas as chamadas externas são feitas pelo bloco **HTTP Request**.

---

# 1. Consultar todos os dados do cliente por CNPJ (uma única URL)

**Uma URL retorna todos os dados do cliente** — cadastro, contratos e títulos — em uma única resposta.

### URL

```
GET https://backnet.app/api/clientes/cnpj/{cnpj}
```

Exemplo: `https://backnet.app/api/clientes/cnpj/37143069000184`

### Configuração no Typebot

1. Gere o token em **Parâmetros** → **Usuários** → **Gerar token**
2. No bloco **HTTP Request**:
   - **URL:** `https://backnet.app/api/clientes/cnpj/{{Cnpj}}`
   - **Método:** `GET`
   - **Headers:** `Authorization: Bearer SEU_TOKEN`

### CNPJ na URL

Use apenas os **14 dígitos** na URL (sem pontuação). Se o visitante digitar `37.143.069/0001-84`, remova a formatação (ex.: `{{Cnpj}}.replace(/\D/g, '')`).

### O que vem na resposta (200)

- `cliente` — dados cadastrais (nome, e-mail, endereço etc.)
- `contratos` — contratos vinculados
- `titulos` — títulos/faturas
- `planos` — planos relacionados

Tudo em **uma única chamada**. Não é necessário chamar outras URLs.

### Resposta (404)

CNPJ não encontrado na base.

### Resposta (401)

Token inválido ou ausente.

---

# 2. Consultar contratos do cliente

Se você já tem o `id` do cliente (por exemplo, da etapa anterior), pode consultar os contratos:

```
GET https://backnet.app/api/contratos/cliente/{clienteId}
```

**Headers:** `Authorization: Bearer SEU_TOKEN`

---

# 3. Consultar títulos do cliente

Para listar os títulos de um cliente:

```
GET https://backnet.app/api/titulos?cliente_id={clienteId}
```

**Headers:** `Authorization: Bearer SEU_TOKEN`

Exemplo: `https://backnet.app/api/titulos?cliente_id=123`

---

# 4. Criar cliente (enviar dados ao BackNet)

Quando o bot coleta dados do visitante e deve criar o cliente no BackNet:

### URL

```
POST https://backnet.app/api/clientes
```

### Configuração no Typebot

1. No bloco **HTTP Request**:
   - **URL:** `https://backnet.app/api/clientes`
   - **Método:** `POST`
   - **Headers:** `Authorization: Bearer SEU_TOKEN`
   - **Body (JSON):** mapeie as variáveis para os campos do BackNet

### Campos obrigatórios

| Campo BackNet   | Exemplo no body         |
|-----------------|-------------------------|
| `cnpj`          | `"{{Cnpj}}"`            |
| `razao_social`  | `"{{RazaoSocial}}"`     |
| `nome_fantasia` | `"{{NomeFantasia}}"`   |
| `email`         | `"{{Email}}"`          |
| `telefone`      | `"{{Telefone}}"`       |
| `whatsapp`      | `"{{Whatsapp}}"`       |
| `cep`           | `"{{Cep}}"`            |
| `endereco`      | `"{{Endereco}}"`       |
| `numero`        | `"{{Numero}}"`         |
| `complemento`   | `"{{Complemento}}"`    |
| `bairro`        | `"{{Bairro}}"`         |
| `cidade`        | `"{{Cidade}}"`        |
| `estado`        | `"{{Estado}}"`        |
| `valor_primeiro_titulo` | `"total"` ou `"proporcional"` |

---

## Resumo das rotas

| Uso                 | Método | Rota                                      | Auth                          |
|---------------------|--------|-------------------------------------------|-------------------------------|
| Cliente por CNPJ    | GET    | `/api/clientes/cnpj/{cnpj}`              | `Authorization: Bearer <token>` |
| Contratos do cliente| GET    | `/api/contratos/cliente/{clienteId}`      | `Authorization: Bearer <token>` |
| Títulos do cliente  | GET    | `/api/titulos?cliente_id={clienteId}`     | `Authorization: Bearer <token>` |
| Criar cliente       | POST   | `/api/clientes`                           | `Authorization: Bearer <token>` |

Todas as rotas exigem o token gerado em **Parâmetros** → **Usuários** → **Gerar token**.
