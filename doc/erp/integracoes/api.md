# API REST

Referência das rotas HTTP do ISP Consultor para **integrações externas**. URL base:

```
https://ispconsultor.com.br
```

::: warning Navegador vs integração
Abrir uma rota `/api/...` direto na barra de endereço costuma retornar **401**, mesmo logado no ERP. Use chamadas programáticas (`fetch`, `curl`, Typebot, etc.) com header `Authorization: Bearer <token>`.
:::

## Autenticação

| Tipo | Como usar | Acesso |
|------|-----------|--------|
| **Token de API** | Header `Authorization: Bearer <token>` — gerado em [Parâmetros → Usuários → Gerar token](/doc/parametros/usuarios) | Rotas listadas nesta página |

O token de API é o **Webhook secret** do usuário (string hexadecimal). Rotas **não** listadas abaixo retornam **403** quando autenticadas só com esse token.

Integração Typebot: [Typebot](/doc/integracoes/typebot).

---

## Rotas com token de API

Header em todas: `Authorization: Bearer SEU_TOKEN`

Rotas disponíveis com token de API:

- `/api/clientes`
- `/api/contratos`
- `/api/titulos`
- `/api/dados-empresa`

### Clientes

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/clientes` | Listar (paginação/filtros na query) |
| GET | `/api/clientes/ativos` | Listar ativos |
| GET | `/api/clientes/cnpj/:cnpj` | Buscar por CNPJ — `data` inclui `contratos`, `titulos` e `planos` aninhados |
| GET | `/api/clientes/:id` | Buscar por ID |
| POST | `/api/clientes` | Criar cliente |
| PUT | `/api/clientes/:id` | Atualizar cliente |
| DELETE | `/api/clientes/:id` | Excluir cliente |

### Contratos

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/contratos` | Listar contratos |
| GET | `/api/contratos/ativos` | Listar ativos |
| GET | `/api/contratos/cliente/:clienteId` | Contratos do cliente |
| GET | `/api/contratos/:id` | Buscar por ID |
| POST | `/api/contratos` | Criar contrato |
| PUT | `/api/contratos/:id` | Atualizar contrato |
| DELETE | `/api/contratos/:id` | Excluir contrato |
| GET | `/api/contratos/:id/servicos-adicionais` | Serviços adicionais |
| POST | `/api/contratos/:id/servicos-adicionais` | Adicionar serviço |
| PUT | `/api/contratos/servicos-adicionais/:id` | Atualizar serviço |
| DELETE | `/api/contratos/servicos-adicionais/:id` | Remover serviço |

### Títulos

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/titulos` | Listar — query `cliente_id`, `status`, paginação, etc. |
| GET | `/api/titulos/stats/geral` | Estatísticas |
| GET | `/api/titulos/contrato/:id` | Por contrato |
| GET | `/api/titulos/contrato/:id/avulsos` | Avulsos do contrato |
| GET | `/api/titulos/:id` | Por ID |
| GET | `/api/titulos/:id/boleto` | PDF do boleto |
| GET | `/api/titulos/:id/link-pagamento` | Link público de pagamento |
| POST | `/api/titulos` | Criar título |
| PUT | `/api/titulos/:id` | Atualizar |
| DELETE | `/api/titulos/:id` | Excluir |
| POST | `/api/titulos/:id/pagar` | Marcar pago |
| POST | `/api/titulos/:id/desmarcar-pago` | Desmarcar pagamento |
| POST | `/api/titulos/:id/estornar` | Estornar |
| POST | `/api/titulos/:id/consultar-recebimento` | Consultar no banco |
| POST | `/api/titulos/:id/enviar-whatsapp` | Enviar cobrança WhatsApp |
| POST | `/api/titulos/:id/enviar-email` | Enviar cobrança e-mail |
| POST | `/api/titulos/:id/enviar-recibo` | Enviar recibo de título pago |

### Dados da empresa

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/dados-empresa` | Dados completos |
| PUT | `/api/dados-empresa` | Atualizar |
| POST | `/api/dados-empresa/logo` | Upload logo |
| POST | `/api/dados-empresa/assinatura` | Upload assinatura |

---

## Exemplos de retorno

Respostas seguem sempre o padrão `{ success, message, data }`. Cada bloco abaixo mostra a **requisição** e a **resposta** real da rota — use como referência para montar sua integração (PHP, Node, Python, etc.).

::: warning Listagens retornam `data` aninhado
Rotas de **listar** (`GET /api/clientes`, `GET /api/contratos`, `GET /api/titulos`) devolvem a paginação dentro de `data.data` e `data.pagination` (o `data` de fora é o envelope padrão, o `data` de dentro é a lista). Rotas de **buscar por ID**, **criar** e **atualizar** devolvem o registro direto em `data`.
:::

### Clientes

::::: details Listar — `GET /api/clientes`

::: code-group

```bash [Requisição]
curl -H "Authorization: Bearer SEU_TOKEN" \
  "https://ispconsultor.com.br/api/clientes?page=1&limit=20"
```

```json [Resposta]
{
  "success": true,
  "data": {
    "success": true,
    "data": [
      {
        "id": "",
        "empresa_id": "",
        "cnpj": "",
        "razao_social": "",
        "nome_fantasia": "",
        "email": "",
        "telefone": "",
        "whatsapp": "",
        "cep": "",
        "endereco": "",
        "numero": "",
        "complemento": "",
        "bairro": "",
        "cidade": "",
        "estado": "",
        "observacoes": "",
        "ativo": true,
        "tipo_cobranca": "titulo",
        "valor_primeiro_titulo": "total",
        "recebe_email": true,
        "recebe_sms": false,
        "recebe_whatsapp": false,
        "created_at": "",
        "updated_at": "",
        "created_at_formatada": ""
      }
    ],
    "pagination": {
      "current_page": "",
      "per_page": "",
      "total": "",
      "last_page": "",
      "from": "",
      "to": ""
    }
  }
}
```

:::

:::::

::::: details Buscar por CNPJ — `GET /api/clientes/cnpj/:cnpj`

::: code-group

```bash [Requisição]
curl -H "Authorization: Bearer SEU_TOKEN" \
  "https://ispconsultor.com.br/api/clientes/cnpj/SEU_CNPJ"
```

```json [Resposta]
{
  "success": true,
  "data": {
    "id": "",
    "empresa_id": "",
    "cnpj": "",
    "razao_social": "",
    "nome_fantasia": "",
    "email": "",
    "telefone": "",
    "whatsapp": "",
    "cidade": "",
    "estado": "",
    "ativo": true,
    "tipo_cobranca": "titulo",
    "contratos": [
      { "id": "", "plano_id": "", "status": "ativo", "valor_final": "", "data_inicio": "" }
    ],
    "titulos": [
      { "id": "", "numero_titulo": "", "valor": "", "status": "pendente", "data_vencimento": "" }
    ],
    "planos": [
      { "id": "", "nome": "", "valor_mensal": "" }
    ]
  }
}
```

:::

:::::

::::: details Criar — `POST /api/clientes`

::: code-group

```bash [Requisição]
curl -X POST "https://ispconsultor.com.br/api/clientes" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "cnpj": "",
    "razao_social": "",
    "nome_fantasia": "",
    "email": "",
    "telefone": "",
    "whatsapp": "",
    "cep": "",
    "endereco": "",
    "numero": "",
    "complemento": "",
    "bairro": "",
    "cidade": "",
    "estado": "",
    "observacoes": "",
    "ativo": true,
    "tipo_cobranca": "titulo",
    "valor_primeiro_titulo": "total",
    "recebe_email": true,
    "recebe_sms": false,
    "recebe_whatsapp": false
  }'
```

```json [Resposta]
{
  "success": true,
  "message": "Cliente criado com sucesso",
  "data": {
    "id": "",
    "empresa_id": "",
    "cnpj": "",
    "razao_social": "",
    "nome_fantasia": "",
    "email": "",
    "ativo": true,
    "tipo_cobranca": "titulo",
    "valor_primeiro_titulo": "total",
    "titulos": [],
    "created_at": "",
    "updated_at": "",
    "created_at_formatada": ""
  }
}
```

:::

:::::

::::: details Atualizar — `PUT /api/clientes/:id`

::: code-group

```bash [Requisição]
curl -X PUT "https://ispconsultor.com.br/api/clientes/1" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "telefone": "", "ativo": true }'
```

```json [Resposta]
{
  "success": true,
  "message": "Cliente atualizado com sucesso",
  "data": {
    "id": "",
    "razao_social": "",
    "telefone": "",
    "ativo": true,
    "titulos": [],
    "updated_at": ""
  }
}
```

:::

:::::

::::: details Excluir — `DELETE /api/clientes/:id`

::: code-group

```bash [Requisição]
curl -X DELETE "https://ispconsultor.com.br/api/clientes/1" \
  -H "Authorization: Bearer SEU_TOKEN"
```

```json [Resposta]
{
  "success": true,
  "message": "Cliente excluído com sucesso"
}
```

```json [Resposta — 403 com vínculos]
{
  "success": false,
  "message": "Não é possível excluir o cliente pois existem título(s) associado(s)"
}
```

:::

:::::

### Contratos

::::: details Listar — `GET /api/contratos`

::: code-group

```bash [Requisição]
curl -H "Authorization: Bearer SEU_TOKEN" \
  "https://ispconsultor.com.br/api/contratos?page=1&limit=20"
```

```json [Resposta]
{
  "success": true,
  "data": {
    "success": true,
    "data": [
      {
        "id": "",
        "empresa_id": "",
        "cliente_id": "",
        "plano_id": "",
        "desconto_percentual": "",
        "desconto_valor": "",
        "valor_final": "",
        "data_inicio": "",
        "data_fim": "",
        "status": "ativo",
        "isento_mensalidade": false,
        "dia_vencimento_id": "",
        "conta_boleto": "",
        "tipo_cobranca_contrato_id": "",
        "usar_endereco_cliente": false,
        "created_at": "",
        "updated_at": "",
        "created_at_formatada": ""
      }
    ],
    "pagination": {
      "current_page": "",
      "per_page": "",
      "total": "",
      "last_page": "",
      "from": "",
      "to": ""
    }
  }
}
```

:::

:::::

::::: details Buscar por ID — `GET /api/contratos/:id`

::: code-group

```bash [Requisição]
curl -H "Authorization: Bearer SEU_TOKEN" \
  "https://ispconsultor.com.br/api/contratos/1"
```

```json [Resposta]
{
  "success": true,
  "data": {
    "id": "",
    "cliente_id": "",
    "plano_id": "",
    "valor_final": "",
    "status": "ativo",
    "data_inicio": "",
    "data_fim": "",
    "dia_vencimento_id": "",
    "conta_boleto": "",
    "tipo_cobranca_contrato_id": "",
    "created_at_formatada": ""
  }
}
```

:::

:::::

::::: details Criar — `POST /api/contratos`

::: code-group

```bash [Requisição]
curl -X POST "https://ispconsultor.com.br/api/contratos" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "cliente_id": "",
    "plano_id": "",
    "dia_vencimento_id": "",
    "conta_boleto": "",
    "tipo_cobranca_contrato_id": "",
    "modelo_documento_id": "",
    "status": "ativo"
  }'
```

```json [Resposta]
{
  "success": true,
  "message": "Contrato criado com sucesso",
  "data": {
    "id": "",
    "cliente_id": "",
    "plano_id": "",
    "valor_final": "",
    "status": "ativo",
    "dia_vencimento_id": "",
    "conta_boleto": "",
    "tipo_cobranca_contrato_id": "",
    "servicos_adicionais": []
  }
}
```

:::

:::::

::::: details Atualizar — `PUT /api/contratos/:id`

::: code-group

```bash [Requisição]
curl -X PUT "https://ispconsultor.com.br/api/contratos/1" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "status": "" }'
```

```json [Resposta]
{
  "success": true,
  "message": "Contrato atualizado com sucesso",
  "data": {
    "id": "",
    "cliente_id": "",
    "status": "",
    "updated_at": ""
  }
}
```

:::

:::::

::::: details Excluir — `DELETE /api/contratos/:id`

::: code-group

```bash [Requisição]
curl -X DELETE "https://ispconsultor.com.br/api/contratos/1" \
  -H "Authorization: Bearer SEU_TOKEN"
```

```json [Resposta]
{
  "success": true,
  "message": "Contrato excluído com sucesso"
}
```

:::

:::::

### Títulos

::::: details Listar — `GET /api/titulos`

::: code-group

```bash [Requisição]
curl -H "Authorization: Bearer SEU_TOKEN" \
  "https://ispconsultor.com.br/api/titulos?cliente_id=1&page=1&limit=20"
```

```json [Resposta]
{
  "success": true,
  "data": {
    "success": true,
    "data": [
      {
        "id": "",
        "empresa_id": "",
        "cliente_id": "",
        "plano_id": "",
        "banco_id": "",
        "contrato_id": "",
        "numero_titulo": "",
        "valor": "",
        "data_vencimento": "",
        "status": "pendente",
        "pago": false,
        "data_pagamento": "",
        "valor_pago": "",
        "codigo_barras": "",
        "linha_digitavel": "",
        "observacoes": "",
        "valor_final": "",
        "is_avulso": false,
        "created_at": "",
        "updated_at": ""
      }
    ],
    "pagination": {
      "current_page": "",
      "per_page": "",
      "total": "",
      "last_page": "",
      "from": "",
      "to": ""
    }
  }
}
```

:::

:::::

::::: details Buscar por ID — `GET /api/titulos/:id`

::: code-group

```bash [Requisição]
curl -H "Authorization: Bearer SEU_TOKEN" \
  "https://ispconsultor.com.br/api/titulos/1"
```

```json [Resposta]
{
  "success": true,
  "data": {
    "id": "",
    "cliente_id": "",
    "contrato_id": "",
    "numero_titulo": "",
    "valor": "",
    "status": "pendente",
    "data_vencimento": "",
    "link_pagamento_publico": ""
  }
}
```

:::

:::::

::::: details Criar — `POST /api/titulos`

::: code-group

```bash [Requisição]
curl -X POST "https://ispconsultor.com.br/api/titulos" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "cliente_id": "",
    "contrato_id": "",
    "plano_id": "",
    "banco_id": "",
    "data_vencimento": "",
    "is_avulso": false,
    "valor": "",
    "descricao": "",
    "observacoes": "",
    "desconto_percentual": "",
    "desconto_valor": "",
    "acrescimo_percentual": "",
    "acrescimo_valor": ""
  }'
```

```json [Resposta]
{
  "success": true,
  "message": "Título criado com sucesso",
  "data": {
    "id": "",
    "cliente_id": "",
    "contrato_id": "",
    "banco_id": "",
    "numero_titulo": "",
    "valor": "",
    "valor_final": "",
    "descricao": "",
    "data_vencimento": "",
    "status": "pendente",
    "pago": false,
    "is_avulso": false
  }
}
```

:::

:::::

::::: details Atualizar — `PUT /api/titulos/:id`

::: code-group

```bash [Requisição]
curl -X PUT "https://ispconsultor.com.br/api/titulos/1" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "status": "", "observacoes": "", "data_vencimento": "", "valor": "" }'
```

```json [Resposta]
{
  "success": true,
  "message": "Título atualizado com sucesso",
  "data": {
    "id": "",
    "status": "",
    "observacoes": "",
    "updated_at": ""
  }
}
```

:::

:::::

::::: details Excluir — `DELETE /api/titulos/:id`

::: code-group

```bash [Requisição]
curl -X DELETE "https://ispconsultor.com.br/api/titulos/1" \
  -H "Authorization: Bearer SEU_TOKEN"
```

```json [Resposta]
{
  "success": true,
  "message": "Título deletado com sucesso"
}
```

:::

:::::

### Dados da empresa

::::: details Buscar — `GET /api/dados-empresa`

::: code-group

```bash [Requisição]
curl -H "Authorization: Bearer SEU_TOKEN" \
  "https://ispconsultor.com.br/api/dados-empresa"
```

```json [Resposta]
{
  "success": true,
  "data": {
    "id": "",
    "razao_social": "",
    "nome_fantasia": "",
    "cnpj": "",
    "inscricao_estadual": "",
    "cep": "",
    "endereco": "",
    "numero": "",
    "bairro": "",
    "cidade": "",
    "estado": "",
    "telefone": "",
    "email": "",
    "responsavel_nome": "",
    "responsavel_cpf": "",
    "responsavel_cargo": "",
    "logo": "",
    "bloqueado_por_atraso": false
  }
}
```

:::

:::::

::::: details Atualizar — `PUT /api/dados-empresa`

::: code-group

```bash [Requisição]
curl -X PUT "https://ispconsultor.com.br/api/dados-empresa" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "telefone": "" }'
```

```json [Resposta]
{
  "success": true,
  "data": {
    "id": "",
    "razao_social": "",
    "telefone": ""
  }
}
```

:::

:::::

## Erros comuns

::: code-group

```json [400 — validação]
{
  "success": false,
  "message": "Dados inválidos",
  "errors": {
    "email": ["Email deve ser válido"],
    "cep": ["CEP inválido"]
  }
}
```

```json [401 — token inválido]
{
  "success": false,
  "message": "Token de API inválido. Gere um novo em Parâmetros → Usuários → Gerar token."
}
```

```json [403 — rota fora do escopo do token]
{
  "success": false,
  "message": "Rota não disponível via token de API"
}
```

```json [404 — não encontrado]
{
  "success": false,
  "message": "Cliente não encontrado"
}
```

:::

---

::: info Precisa de ajuda?
**Suporte ISP Consultor:** [WhatsApp (84) 99866-7245](https://wa.me/5584998667245) · [Telegram @LucasMidia](https://t.me/LucasMidia)

Ao abrir um chamado, informe empresa, usuário, tela ou módulo, passos para reproduzir e capturas ou mensagem de erro.
:::
