# Bancos

Guia para cadastrar as **contas bancárias emissoras de boletos** usadas nos contratos com clientes. Sem um banco configurado, o contrato não consegue gerar cobranças.

::: tip Pré-requisito de contrato
Configure o banco **antes** de criar contratos. Veja a [ordem sugerida](/doc/clientes/aba-contratos#ordem-sugerida).
:::

## Como acessar

1. Faça login no painel administrativo.
2. No menu lateral, abra **Cadastros**.
3. Clique em **Bancos**.

## Listagem

A tela segue o padrão de [listagens do ERP](/doc/geral/listagens). Abaixo, apenas o que é **específico** do módulo Bancos.

### Busca — campos disponíveis

- ID
- Nome
- Descrição
- Tipo de Banco
- Sandbox
- Status

### Colunas da tabela

- **ID**
- **Nome**
- **Descrição**
- **Tipo de Banco**
- **Sandbox**
- **Status**

---

## Cadastrar um banco

1. Na listagem, clique em **Novo**.
2. Preencha **Informações Básicas** e **Configurações da API**.
3. Clique em **Salvar**.

### Abas do formulário

| Aba | Conteúdo |
|-----|----------|
| Informações Básicas | Identificação e status da conta |
| Configurações da API | Credenciais e parâmetros de emissão de boletos |

---

## Aba Informações Básicas

| Campo | Obrigatório | Descrição |
|-------|:-----------:|-----------|
| **Nome do Banco** | Sim | Nome de referência interna (ex.: *EFI Produção*, *Asaas Teste*) |
| **Tipo de Banco** | Sim | **EFI (Código: 364)** ou **Asaas (Código: 461)** — ao alterar, os campos da aba **Configurações da API** são atualizados |
| **Ativo** | Sim | **Sim** = conta ativa · **Não** = conta inativa |
| **Descrição** | Não | Observações sobre a conta |

::: tip Tipo de banco
Selecione o **Tipo de Banco** antes de preencher a aba **Configurações da API**. Cada integração (EFI ou Asaas) exibe credenciais e opções diferentes.
:::

---

## Aba Configurações da API

Os campos desta aba **dependem do Tipo de Banco** selecionado em Informações Básicas. Ao trocar entre EFI e Asaas, o formulário é recarregado com os campos correspondentes à integração escolhida.

### Campos comuns (EFI e Asaas)

| Campo | Obrigatório | Descrição |
|-------|:-----------:|-----------|
| **URL de Retorno (Webhook)** | Não | URL de callback para confirmação de pagamentos — muda conforme o tipo (`/webhook/efi` ou `/webhook/asaas`). Use **Copiar** para obter a URL padrão |
| **Sandbox** | Sim | **Sim** = ambiente de homologação (testes) · **Não** = produção |
| **Percentual de Multa (%)** | Não | Multa por atraso (padrão: 2,00) |
| **Percentual de Juros (% ao dia)** | Não | Juros diários (padrão: 0,03) |

::: info Ambiente de teste
Em ambiente de homologação, marque **Sandbox = Sim** e use as credenciais de sandbox do provedor de pagamento. Para cobranças reais em produção, use **Sandbox = Não** com credenciais de produção.
:::

### EFI — campos adicionais

| Campo | Obrigatório | Descrição |
|-------|:-----------:|-----------|
| **Client ID Produção** | Sim* | Identificador da API |
| **Client Secret Produção** | Sim* | Segredo da API — preencha apenas ao cadastrar ou atualizar |
| **Identificador da Conta** | Sim | Código da conta no painel EFI (menu de configurações da API) |
| **Local de Pagamento** | Não | Texto impresso no boleto (ex.: *Pagável em qualquer banco até o vencimento*) |

### Asaas — campos adicionais

| Campo | Obrigatório | Descrição |
|-------|:-----------:|-----------|
| **API Key** | Sim | Chave de API do Asaas |
| **Webhook Secret** | Não | Segredo gerado pela Asaas para validar webhooks |
| **Incluir Taxa no Boleto** | Não | **Sim** = repassa taxas ao pagador · **Não** = não inclui (padrão) |
| **Usar integração do banco para NFS-e** | Não | **Sim** = ao salvar, configura o cliente NFS-e como Asaas usando a API Key e o ambiente deste banco · **Não** = não altera NFS-e (padrão) |

::: info Credenciais
Obtenha as credenciais no painel do provedor de pagamento (EFI ou Asaas), sempre no ambiente correspondente ao valor de **Sandbox**.
:::

---

## Editar ou excluir

1. Selecione o banco na listagem.
2. Use **Editar** ou **Deletar** conforme necessário.

::: warning
Contas vinculadas a contratos ativos não devem ser removidas — prefira inativar.
:::
---

::: info Precisa de ajuda?
**Suporte ISP Consultor:** [WhatsApp (84) 99866-7245](https://wa.me/5584998667245) · [Telegram @LucasMidia](https://t.me/LucasMidia)

Ao abrir um chamado, informe empresa, usuário, tela ou módulo, passos para reproduzir e capturas ou mensagem de erro.
:::
