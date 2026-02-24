# BackNet ERP — Documentação de Rotas da API

## Tipos de Autenticação

| Tipo | Como usar | Acesso |
|------|-----------|--------|
| **Pública** | Sem autenticação | Rotas específicas abertas |
| **JWT (sessão)** | Cookie `auth_token` (automático no browser) | Sistema interno completo |
| **Token de API** | Header `Authorization: Bearer bkn_...` | Integrações externas (rotas restritas) |

> **Nota:** Acessar rotas da API diretamente no navegador (barra de endereço) retorna `401 Unauthorized` mesmo estando logado. As rotas só respondem a chamadas programáticas (fetch/axios).

---

## Rotas Públicas (sem autenticação)

### Health Check
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/health` | Status do servidor |
| GET | `/api/health` | Health check básico |
| GET | `/api/health/detailed` | Health check detalhado |
| GET | `/client-ip` | IP do cliente |

### Autenticação
| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/auth/login` | Login (retorna cookie JWT) |
| POST | `/api/auth/logout` | Logout (limpa cookie) |

### Auxiliares
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/clientes/buscar-cep/:cep` | Consultar CEP |
| GET | `/api/clientes/consultar-cnpj/:cnpj` | Consultar CNPJ |
| GET | `/api/fornecedores/consultar-cnpj/:cnpj` | Consultar CNPJ de fornecedor |
| GET | `/api/dados-empresa/logo` | Logo da empresa |
| GET | `/api/hotsite/public` | Hotsite público (HTML renderizado) |

### Pagamento Público
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/pagamento/:id/:token` | Página pública de pagamento |
| GET | `/api/pagamento/:id/:token/pdf` | PDF do boleto (público) |

### Central do Assinante

> `<slug>` é derivado do `nome_fantasia` da empresa (ex: "Minha Internet" → `minha-internet`).  
> Ver documentação completa em [docs/CENTRAL_ASSINANTE.md](CENTRAL_ASSINANTE.md).

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/dados-empresa/public/<slug>` | Logo e nome da empresa por slug |
| POST | `/api/central-assinante/<slug>/login` | Login do assinante |
| POST | `/api/central-assinante/<slug>/recuperar-senha` | Recuperar senha |
| GET | `/api/central-assinante/<slug>/me` | Dados do assinante (token via header) |
| POST | `/api/central-assinante/<slug>/me/trocar-senha` | Trocar senha |
| GET | `/api/central-assinante/<slug>/me/contrato/:id/pdf` | PDF do contrato |
| GET | `/api/central-assinante/<slug>/me/termo/:id/pdf` | PDF do termo |
| GET | `/api/central-assinante/<slug>/me/fatura/:id/pdf` | PDF da fatura |
| GET | `/api/central-assinante/<slug>/me/recibo/:id/pdf` | PDF do recibo |
| GET | `/api/central-assinante/:clienteId/:token` | *(legacy)* Dados com token na URL |
| GET | `/api/central-assinante/:clienteId/:token/contrato/:id/pdf` | *(legacy)* PDF contrato |
| GET | `/api/central-assinante/:clienteId/:token/termo/:id/pdf` | *(legacy)* PDF termo |
| GET | `/api/central-assinante/:clienteId/:token/fatura/:id/pdf` | *(legacy)* PDF fatura |
| GET | `/api/central-assinante/:clienteId/:token/recibo/:id/pdf` | *(legacy)* PDF recibo |

### Webhooks (públicos)
| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/webhook/efi` | Webhook Efí Bank |
| POST | `/webhook/asaas` | Webhook Asaas |
| POST | `/webhook/integration` | Webhook integrações |
| GET | `/webhook/integration/pdf/:token` | PDF via webhook |
| POST | `/api/assinatura-digital/webhook/assinafy` | Webhook Assinafy |
| POST | `/api/assinatura-digital/webhook/zapsign` | Webhook ZapSign |

### Rotas TXT Blockdomi (protegidas por IP cadastrado)
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/domain/version` | Versão atual da lista |
| GET | `/domain/all` | Lista de domínios (TXT) |
| GET | `/v4/all` | Lista IPv4 (TXT) |
| GET | `/v6/all` | Lista IPv6 (TXT) |

### Download de Arquivos
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/cliente-arquivos/:id/download` | Download de arquivo do cliente |
| GET | `/arquivos/*` | Arquivos estáticos |

---

## Rotas Privadas — JWT + Token de API (`bkn_`)

> Acessíveis via cookie JWT (sistema interno) **ou** via `Authorization: Bearer bkn_...` (integrações externas).

### Clientes
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/clientes` | Listar clientes |
| GET | `/api/clientes/ativos` | Listar clientes ativos |
| GET | `/api/clientes/cnpj/:cnpj` | Buscar por CNPJ |
| GET | `/api/clientes/:id` | Buscar cliente por ID |
| POST | `/api/clientes` | Criar cliente |
| PUT | `/api/clientes/:id` | Atualizar cliente |
| DELETE | `/api/clientes/:id` | Excluir cliente |

### Contratos
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/contratos` | Listar contratos |
| GET | `/api/contratos/ativos` | Listar contratos ativos |
| GET | `/api/contratos/cliente/:clienteId` | Contratos por cliente |
| GET | `/api/contratos/:id` | Buscar contrato por ID |
| POST | `/api/contratos` | Criar contrato |
| PUT | `/api/contratos/:id` | Atualizar contrato |
| DELETE | `/api/contratos/:id` | Excluir contrato |
| GET | `/api/contratos/:id/servicos-adicionais` | Serviços adicionais do contrato |
| POST | `/api/contratos/:id/servicos-adicionais` | Adicionar serviço adicional |
| PUT | `/api/contratos/servicos-adicionais/:id` | Atualizar serviço adicional |
| DELETE | `/api/contratos/servicos-adicionais/:id` | Remover serviço adicional |

### Títulos Financeiros
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/titulos` | Listar títulos |
| GET | `/api/titulos/stats/geral` | Estatísticas gerais |
| GET | `/api/titulos/contrato/:id` | Títulos por contrato |
| GET | `/api/titulos/contrato/:id/avulsos` | Títulos avulsos por contrato |
| GET | `/api/titulos/:id` | Buscar título por ID |
| GET | `/api/titulos/:id/boleto` | PDF do boleto |
| GET | `/api/titulos/:id/link-pagamento` | Gerar link de pagamento |
| POST | `/api/titulos` | Criar título |
| POST | `/api/titulos/:id/pagar` | Marcar como pago |
| POST | `/api/titulos/:id/desmarcar-pago` | Desmarcar pagamento |
| POST | `/api/titulos/:id/estornar` | Estornar pagamento |
| POST | `/api/titulos/:id/consultar-recebimento` | Consultar recebimento |
| POST | `/api/titulos/:id/enviar-whatsapp` | Enviar cobrança via WhatsApp |
| POST | `/api/titulos/:id/enviar-email` | Enviar cobrança via e-mail |
| PUT | `/api/titulos/:id` | Atualizar título |
| DELETE | `/api/titulos/:id` | Excluir título |

### Dados da Empresa
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/dados-empresa` | Buscar dados da empresa |
| PUT | `/api/dados-empresa` | Atualizar dados da empresa |
| POST | `/api/dados-empresa/logo` | Upload de logo |
| POST | `/api/dados-empresa/assinatura` | Upload de assinatura |

---

## Rotas Privadas — JWT apenas (sistema interno)

> Acessíveis **somente** via cookie JWT (login no sistema). Token `bkn_` retorna **403**.

### Dashboard
| Método | Rota |
|--------|------|
| GET | `/api/dashboard` |
| GET | `/api/dashboard/stats` |
| GET | `/api/dashboard/titulos-recentes` |
| GET | `/api/dashboard/titulos-vencidos` |
| GET | `/api/dashboard/titulos-proximos-vencimento` |
| GET | `/api/dashboard/grafico-titulos-status` |
| GET | `/api/dashboard/grafico-clientes-cidade` |
| GET | `/api/dashboard/resumo-mensal` |

### Usuários
| Método | Rota |
|--------|------|
| GET | `/api/usuarios` |
| GET | `/api/usuarios/:id` |
| POST | `/api/usuarios` |
| PUT | `/api/usuarios/:id` |
| DELETE | `/api/usuarios/:id` |
| POST | `/api/usuarios/:id/gerar-webhook-secret` |

### Empresas (multi-tenant)
| Método | Rota |
|--------|------|
| GET | `/api/empresas` |
| GET | `/api/empresas/:id` |
| POST | `/api/empresas` |
| PUT | `/api/empresas/:id` |
| DELETE | `/api/empresas/:id` |

### Tokens de API
| Método | Rota |
|--------|------|
| GET | `/api/api-tokens` |
| POST | `/api/api-tokens` |
| DELETE | `/api/api-tokens/:id` |

### Planos
| Método | Rota |
|--------|------|
| GET | `/api/planos` |
| GET | `/api/planos/ativos` |
| GET | `/api/planos/:id` |
| POST | `/api/planos` |
| PUT | `/api/planos/:id` |
| PATCH | `/api/planos/:id/status` |
| DELETE | `/api/planos/:id` |

### Bancos / Gateways
| Método | Rota |
|--------|------|
| GET | `/api/bancos` |
| GET | `/api/bancos/ativos` |
| GET | `/api/bancos/:id` |
| POST | `/api/bancos` |
| PUT | `/api/bancos/:id` |
| DELETE | `/api/bancos/:id` |
| POST | `/api/bancos/:id/testar-conexao` |
| POST | `/api/bancos/:id/buscar-dados-api` |
| POST | `/api/bancos/:id/gerar-webhook-secret` |
| GET | `/api/bancos/:tipoBanco/url-padrao` |

### Parâmetros do Sistema
| Método | Rota |
|--------|------|
| GET | `/api/parametro` |
| PUT | `/api/parametro` |
| POST | `/api/parametro/reset-defaults` |
| GET | `/api/parametro/categoria/:categoria` |
| GET | `/api/parametro/:chave` |
| PUT | `/api/parametro/:chave` |
| GET | `/api/parametros` |
| PUT | `/api/parametros` |

### Fornecedores
| Método | Rota |
|--------|------|
| GET | `/api/fornecedores` |
| GET | `/api/fornecedores/:id` |
| POST | `/api/fornecedores` |
| PUT | `/api/fornecedores/:id` |
| DELETE | `/api/fornecedores/:id` |

### Contas a Pagar
| Método | Rota |
|--------|------|
| GET | `/api/contas-pagar` |
| GET | `/api/contas-pagar/resumo` |
| GET | `/api/contas-pagar/:id` |
| POST | `/api/contas-pagar` |
| PUT | `/api/contas-pagar/:id` |
| DELETE | `/api/contas-pagar/:id` |
| POST | `/api/contas-pagar/:id/pagar` |
| POST | `/api/contas-pagar/:id/cancelar` |
| POST | `/api/contas-pagar/:id/duplicar` |

### Notas Fiscais (NFS-e)
| Método | Rota |
|--------|------|
| GET | `/api/notas-fiscais` |
| GET | `/api/notas-fiscais/cliente/:id` |
| POST | `/api/notas-fiscais/gerar` |
| GET | `/api/notas-fiscais/:id` |
| GET | `/api/notas-fiscais/:id/status` |
| GET | `/api/notas-fiscais/:id/pdf` |
| POST | `/api/notas-fiscais/:id/cancelar` |
| GET | `/api/nfse-config` |
| PUT | `/api/nfse-config` |
| POST | `/api/nfse-config/test-auth` |

### Assinatura Digital
| Método | Rota |
|--------|------|
| GET | `/api/assinatura-digital` |
| GET | `/api/assinatura-digital/:id` |
| POST | `/api/assinatura-digital/enviar` |
| GET | `/api/assinatura-digital/:id/status` |
| GET | `/api/assinatura-digital/:id/download` |
| PUT | `/api/assinatura-digital/:id/cancelar` |
| GET | `/api/assinatura-digital-providers` |
| GET | `/api/assinatura-digital-providers/habilitado` |
| GET | `/api/assinatura-digital-providers/:provider` |
| PUT | `/api/assinatura-digital-providers/:provider` |
| DELETE | `/api/assinatura-digital-providers/:provider` |

### Auditoria
| Método | Rota |
|--------|------|
| GET | `/api/auditoria` |
| GET | `/api/auditoria/entity` |
| GET | `/api/auditoria/pdf` |
| GET | `/api/auditoria/stats/summary` |
| GET | `/api/auditoria/:id` |

### Backups
| Método | Rota |
|--------|------|
| GET | `/api/backups` |
| POST | `/api/backups/manual` |
| GET | `/api/backups/:nome/download` |
| POST | `/api/backups/:nome/restore` |
| DELETE | `/api/backups/:nome` |

### Blockdomi (Painel)
| Método | Rota |
|--------|------|
| GET | `/api/dominios` |
| GET | `/api/dominios/:id` |
| POST | `/api/dominios` |
| POST | `/api/dominios/bulk` |
| POST | `/api/dominios/bulk-delete` |
| PUT | `/api/dominios/:id` |
| DELETE | `/api/dominios/:id` |
| GET | `/api/ipv4` |
| GET | `/api/ipv4/:id` |
| POST | `/api/ipv4` |
| POST | `/api/ipv4/bulk` |
| POST | `/api/ipv4/bulk-delete` |
| PUT | `/api/ipv4/:id` |
| DELETE | `/api/ipv4/:id` |
| GET | `/api/ipv6` |
| GET | `/api/ipv6/:id` |
| POST | `/api/ipv6` |
| POST | `/api/ipv6/bulk` |
| POST | `/api/ipv6/bulk-delete` |
| PUT | `/api/ipv6/:id` |
| DELETE | `/api/ipv6/:id` |
| GET | `/api/blockdomi/logs-acesso` |
| POST | `/api/blockdomi/importar-lista` |
| POST | `/api/blockdomi/gerar-versao` |
| GET | `/api/ips-permitidos` |
| GET | `/api/ips-permitidos/:id` |
| POST | `/api/ips-permitidos` |
| PUT | `/api/ips-permitidos/:id` |
| DELETE | `/api/ips-permitidos/:id` |

### Scheduler / Workers
| Método | Rota |
|--------|------|
| GET | `/api/scheduler` |
| GET | `/api/scheduler/status` |
| GET | `/api/scheduler/logs` |
| GET | `/api/scheduler/:id` |
| POST | `/api/scheduler` |
| PUT | `/api/scheduler/:id` |
| DELETE | `/api/scheduler/:id` |
| PATCH | `/api/scheduler/:id/toggle` |
| POST | `/api/scheduler/:id/execute` |
| GET | `/api/scheduler/logs/:id` |
| GET | `/api/workers/status` |
| GET | `/api/workers/health` |
| GET | `/api/workers/stats` |
| POST | `/api/workers/execute/:id` |
| GET | `/api/workers/logs` |
| GET | `/api/workers/logs/:id` |

### Mensagens / Comunicação
| Método | Rota |
|--------|------|
| GET | `/api/servidores-email` |
| GET | `/api/servidores-email/ativo` |
| POST | `/api/servidores-email` |
| PUT | `/api/servidores-email/:id` |
| DELETE | `/api/servidores-email/:id` |
| POST | `/api/servidores-email/:id/test` |
| POST | `/api/servidores-email/:id/teste-email` |
| GET | `/api/mensagens-email/tipo/:tipo` |
| POST | `/api/mensagens-email` |
| GET | `/api/servidores-whatsapp` |
| GET | `/api/servidores-whatsapp/ativo` |
| POST | `/api/servidores-whatsapp` |
| PUT | `/api/servidores-whatsapp/:id` |
| DELETE | `/api/servidores-whatsapp/:id` |
| POST | `/api/servidores-whatsapp/:id/conectar` |
| POST | `/api/servidores-whatsapp/:id/enviar-mensagem-teste` |
| GET | `/api/mensagens-whatsapp/tipo/:tipo` |
| POST | `/api/mensagens-whatsapp` |
| GET | `/api/mensagens-historico` |
| GET | `/api/mensagens-historico/:id` |
| GET | `/api/mensagens-historico/entidade/:tipo/:id` |

### Outros
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/dias-vencimento` | Dias de vencimento |
| POST | `/api/dias-vencimento` | Criar dia de vencimento |
| PUT | `/api/dias-vencimento` | Atualizar dias de vencimento |
| GET | `/api/tipos-cobranca-contrato` | Tipos de cobrança |
| GET | `/api/tipos-cobranca-contrato/:id` | Tipo por ID |
| POST | `/api/tipos-cobranca-contrato` | Criar tipo |
| PUT | `/api/tipos-cobranca-contrato/:id` | Atualizar tipo |
| DELETE | `/api/tipos-cobranca-contrato/:id` | Excluir tipo |
| GET | `/api/termos-contrato` | Termos ativos |
| GET | `/api/termos-contrato/:id` | Termo por ID |
| POST | `/api/termos-contrato/contrato/:id` | Criar termo |
| PUT | `/api/termos-contrato/:id` | Atualizar termo |
| DELETE | `/api/termos-contrato/:id` | Excluir termo |
| GET | `/api/modelos-documento` | Modelos de documento |
| GET | `/api/modelos-documento/:id` | Modelo por ID |
| POST | `/api/modelos-documento` | Criar modelo |
| PUT | `/api/modelos-documento/:id` | Atualizar modelo |
| DELETE | `/api/modelos-documento/:id` | Excluir modelo |
| GET | `/api/cliente-arquivos/cliente/:id` | Arquivos do cliente |
| POST | `/api/cliente-arquivos` | Upload de arquivo |
| DELETE | `/api/cliente-arquivos/:id` | Excluir arquivo |
| GET | `/api/hotsite` | Configuração do hotsite |
| PUT | `/api/hotsite` | Atualizar hotsite |
| POST | `/api/pdf-extract/extract` | Extrair texto de PDF |
| POST | `/api/pdf-extract/extract-from-url` | Extrair texto de PDF via URL |
| GET | `/api/atualizacoes` | Verificar atualizações |

---

## Exemplo de uso com Token de API

```bash
# Listar clientes
curl -H "Authorization: Bearer bkn_SEU_TOKEN_AQUI" \
  https://backnet.app/api/clientes?page=1&limit=20

# Buscar contrato por ID
curl -H "Authorization: Bearer bkn_SEU_TOKEN_AQUI" \
  https://backnet.app/api/contratos/123

# Listar títulos em aberto
curl -H "Authorization: Bearer bkn_SEU_TOKEN_AQUI" \
  "https://backnet.app/api/titulos?status=aberto&page=1&limit=50"
```

> Tokens de API são criados em **Parâmetros → Tokens de API** no painel administrativo.
