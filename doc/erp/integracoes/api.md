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

Prefixos permitidos pelo backend:

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

### Dados da empresa

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/dados-empresa` | Dados completos |
| PUT | `/api/dados-empresa` | Atualizar |
| POST | `/api/dados-empresa/logo` | Upload logo |
| POST | `/api/dados-empresa/assinatura` | Upload assinatura |

---

## Exemplo

```bash
curl -H "Authorization: Bearer SEU_TOKEN" \
  "https://ispconsultor.com.br/api/clientes?page=1&limit=20"

curl -H "Authorization: Bearer SEU_TOKEN" \
  "https://ispconsultor.com.br/api/clientes/cnpj/37143069000184"

curl -H "Authorization: Bearer SEU_TOKEN" \
  "https://ispconsultor.com.br/api/titulos?cliente_id=123&page=1&limit=50"
```

Respostas seguem o padrão `{ success, message, data }`.
---

::: info Precisa de ajuda?
**Suporte ISP Consultor:** [WhatsApp (84) 99866-7245](https://wa.me/5584998667245) · [Telegram @LucasMidia](https://t.me/LucasMidia)

Ao abrir um chamado, informe empresa, usuário, tela ou módulo, passos para reproduzir e capturas ou mensagem de erro.
:::
