# API REST

Referência das rotas HTTP do ISP Consultor. URL base:

```
https://ispconsultor.com.br
```

::: warning Navegador vs integração
Abrir uma rota `/api/...` direto na barra de endereço costuma retornar **401**, mesmo logado no ERP. A API responde a chamadas programáticas (`fetch`, `curl`, Typebot, etc.) com cookie JWT ou header `Authorization`.
:::

## Tipos de autenticação

| Tipo | Como usar | Acesso |
|------|-----------|--------|
| **Pública** | Sem autenticação | Rotas listadas abaixo |
| **JWT (sessão)** | Cookie `auth_token` (automático no browser após login) | ERP interno completo |
| **Token de API** | Header `Authorization: Bearer <token>` — gerado em [Parâmetros → Usuários → Gerar token](/doc/parametros/usuarios) | Integrações externas (rotas permitidas) |

O token de API é o **Webhook secret** do usuário (string hexadecimal). Rotas **não** listadas na seção [Token de API](#rotas-com-token-de-api) retornam **403** quando autenticadas só com esse token.

Integração Typebot: [Typebot](/doc/integracoes/typebot).

---

## Rotas públicas (sem autenticação)

### Health check

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/health` | Status do servidor |
| GET | `/api/health` | Health check básico |
| GET | `/api/health/detailed` | Health check detalhado |
| GET | `/client-ip` | IP do cliente |

### Autenticação (ERP)

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/auth/login` | Login (define cookie JWT) |
| POST | `/api/auth/logout` | Logout (remove cookie) |

### Auxiliares de formulário

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/clientes/buscar-cep/:cep` | Consultar CEP (ViaCEP) |
| GET | `/api/clientes/consultar-cnpj/:cnpj` | Consultar CNPJ (Receita) |
| GET | `/api/fornecedores/consultar-cnpj/:cnpj` | Consultar CNPJ de fornecedor |
| GET | `/api/dados-empresa/logo` | Logo da empresa (redirect) |
| GET | `/api/dados-empresa/public` | Logo e nome (empresa padrão do host) |
| GET | `/api/dados-empresa/public/:slug` | Logo e nome por slug (multiloja) |

### Pagamento público

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/pagamento/session` | Troca token do link por cookie de sessão (fluxo preferido) |
| GET | `/api/pagamento/:id` | Dados do título (com cookie de sessão) |
| GET | `/api/pagamento/:id/pdf` | PDF do boleto (com cookie de sessão) |
| GET | `/api/pagamento/:id/:token` | *(legado)* Título com token na URL |
| GET | `/api/pagamento/:id/:token/pdf` | *(legado)* PDF com token na URL |

### Central do Assinante

`<slug>` vem do `nome_fantasia` da empresa (ex.: `Minha Internet` → `minha-internet`).

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/central-assinante/:slug/login` | Login do assinante |
| POST | `/api/central-assinante/:slug/recuperar-senha` | Recuperar senha |
| GET | `/api/central-assinante/:slug/me` | Dados do assinante (token no header) |
| POST | `/api/central-assinante/:slug/me/trocar-senha` | Trocar senha |
| GET | `/api/central-assinante/:slug/me/contrato/:id/pdf` | PDF do contrato |
| GET | `/api/central-assinante/:slug/me/termo/:id/pdf` | PDF do termo |
| GET | `/api/central-assinante/:slug/me/fatura/:id/pdf` | PDF da fatura |
| GET | `/api/central-assinante/:slug/me/recibo/:id/pdf` | PDF do recibo |
| GET | `/api/central-assinante/:clienteId/:token` | *(legado)* Dados com token na URL |
| GET | `/api/central-assinante/:clienteId/:token/contrato/:id/pdf` | *(legado)* PDF contrato |
| GET | `/api/central-assinante/:clienteId/:token/termo/:id/pdf` | *(legado)* PDF termo |
| GET | `/api/central-assinante/:clienteId/:token/fatura/:id/pdf` | *(legado)* PDF fatura |
| GET | `/api/central-assinante/:clienteId/:token/recibo/:id/pdf` | *(legado)* PDF recibo |

### Webhooks (públicos)

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/webhook/efi/:empresaIdentifier` | Webhook Efí (`:empresaIdentifier` = ID do banco ou `saas`) |
| POST | `/webhook/asaas/:empresaIdentifier` | Webhook Asaas |
| POST | `/api/assinatura-digital/webhook/assinafy` | Webhook Assinafy |
| POST | `/api/assinatura-digital/webhook/zapsign` | Webhook ZapSign |

### Blockdomi — listas TXT (IP permitido)

Protegidas por IP cadastrado em **Blockdomi → IPs permitidos** (sem token).

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/domain/version` | Versão atual da lista |
| GET | `/domain/all` | Domínios (TXT) |
| GET | `/v4/all` | IPv4 (TXT) |
| GET | `/v6/all` | IPv6 (TXT) |

Aliases equivalentes com prefixo `/api/` (`/api/domain/version`, etc.).

### Arquivos

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/cliente-arquivos/:id/download` | Download de arquivo do cliente |
| GET | `/arquivos/*` | Arquivos estáticos (logos, uploads) |

---

## Rotas com token de API

Header em todas: `Authorization: Bearer SEU_TOKEN`

Prefixos permitidos pelo backend:

- `/api/clientes`
- `/api/contratos`
- `/api/titulos`
- `/api/dados-empresa`
- `/api/blockdomi-publico`

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

### Blockdomi público (JSON)

Requer token de API (não é anônimo).

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/blockdomi-publico` | Ofícios, SEI, datas e versões (sem listas completas) |
| GET | `/api/blockdomi-publico/versao` | Número da versão atual |

---

## Exemplo com token de API

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

## Rotas internas (JWT — sistema ERP)

Acessíveis **somente** com sessão do ERP (cookie JWT após login). Token de API retorna **403**.

Principais grupos (prefixo `https://ispconsultor.com.br`):

| Grupo | Prefixo | Exemplos |
|-------|---------|----------|
| Dashboard | `/api/dashboard` | `/stats`, `/titulos-recentes`, gráficos |
| Usuários | `/api/usuarios` | CRUD + `POST /:id/gerar-webhook-secret` |
| Planos, bancos, fornecedores | `/api/planos`, `/api/bancos`, `/api/fornecedores` | CRUD padrão |
| Contas a pagar | `/api/contas-pagar` | CRUD, pagar, cancelar, duplicar |
| NFS-e | `/api/notas-fiscais`, `/api/nfse-config` | Emissão, PDF, cancelamento |
| Assinatura digital | `/api/assinatura-digital` | Enviar, status, download, cancelar |
| Auditoria | `/api/auditoria` | Listagem, PDF, por entidade |
| Blockdomi (painel) | `/api/dominios`, `/api/ipv4`, `/api/ipv6`, `/api/blockdomi`, `/api/ips-permitidos` | CRUD e importação |
| Comunicação | `/api/servidores-email`, `/api/servidores-whatsapp`, `/api/mensagens-*` | Servidores e templates |
| Scheduler | `/api/scheduler`, `/api/workers` | Rotinas e filas |
| IXC | `/api/integracao-ixc-provedor`, `/api/ixc/ordens-servico` | Integração e OS |
| RPKI, agentes, SSH | `/api/rpki`, `/api/agents`, `/api/ssh-manager` | Módulos técnicos |
| PDF extract | `/api/pdf-extract/extract`, `/status/:jobId`, `/progress/:jobId` | Extração assíncrona |
| Parâmetros | `/api/parametros`, `/api/dias-vencimento`, `/api/modelos-documento` | Configurações |

Atualização do sistema (SuperAdmin SaaS): `/api/saas/atualizacoes` — não confundir com rota inexistente `/api/atualizacoes`.

---

::: info Precisa de ajuda?
Consulte [Suporte e Chamados](/doc/configuracoes/suporte) para abrir um chamado com a equipe ISP Consultor.
:::
