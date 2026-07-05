# Asaas — API e Webhook

Guia completo para integrar o **Asaas** com o ISP Consultor: obter a **API Key**, cadastrar o **webhook** no painel Asaas e configurar o **banco** no ERP.

::: info Documentação relacionada
Cadastro de bancos no ERP: [Bancos](/doc/cadastros/bancos). Contratos que usam o banco: [Contratos](/doc/clientes/aba-contratos).
:::

## Visão geral

| Direção | O que faz |
|---------|-----------|
| **ERP → Asaas (API)** | Emite boletos/PIX, consulta e cancela cobranças via API v3 |
| **Asaas → ERP (Webhook)** | Notifica pagamentos, confirmações, estornos e cancelamentos |

---

## Pré-requisitos

1. **Conta no Asaas** — crie em [www.asaas.com](https://www.asaas.com) se ainda não tiver.

---

## Parte A — Painel Asaas

### 1. Acessar Integrações

1. Faça login em [www.asaas.com](https://www.asaas.com).
2. Clique no **ícone da conta** (canto superior direito).
3. Selecione **Integrações**.

![Menu Integrações no Asaas](/integracoes/asaas/01-menu-integracoes.png)

**Atalho alternativo:** **Minha Conta** → aba **Integração** → links para Chaves de API e Webhooks.

URLs diretas (após login):

| Tela | URL |
|------|-----|
| Integrações | `https://www.asaas.com/customerConfigIntegrations/index` |
| Chaves de API | `https://www.asaas.com/customerApiAccessToken/index` |
| Webhooks | `https://www.asaas.com/customerConfigIntegrations/webhooks` |

---

### 2. Gerar a API Key {#gerar-api-key}

1. Na tela **Integrações**, abra a aba **Chaves de API**.
2. Clique em **Gerar chave de API**.

![Aba Chaves de API](/integracoes/asaas/02-chaves-api.png)

3. Informe um **Nome da chave** (ex.: *ispconsultor*) e clique em **Avançar**.

![Nome da chave de API](/integracoes/asaas/03-gerar-chave-nome.png)

4. O Asaas solicita **validação por SMS**. Clique em **Enviar código**.

![Validação SMS — enviar código](/integracoes/asaas/04-validacao-sms-enviar.png)

5. Informe o código recebido no celular cadastrado e clique em **Gerar chave de API**.

![Validação SMS — informar código](/integracoes/asaas/05-validacao-sms-codigo.png)

6. Na tela de confirmação, clique em **Copiar** e guarde a chave em local seguro — ela **não poderá ser exibida novamente**. Cole no ERP na aba **Configurações da API** do banco.

![Chave gerada — copiar](/integracoes/asaas/06-chave-gerada-copiar.png)

::: warning Segurança
Não compartilhe a API Key em tickets, prints ou repositórios. Regenerar a chave invalida a anterior — atualize o banco no ERP após trocar.
:::

---

### 3. Cadastrar o Webhook

1. Na tela **Integrações**, abra a aba **Webhooks**.
2. Clique em **+ Adicionar Webhook**.

![Aba Webhooks — lista](/integracoes/asaas/07-webhooks-lista.png)

3. Preencha a seção **Dados do Webhook** conforme a tabela abaixo e clique em **Salvar** (canto superior direito).

![Formulário Adicionar Webhook](/integracoes/asaas/08-adicionar-webhook-form.png)

| Campo | Valor |
|-------|--------|
| **Este Webhook ficará ativo?** | **Sim** |
| **Nome do Webhook** | Nome de referência (ex.: *ISP Consultor - Cobranças*) |
| **URL do Webhook** | Cole a URL exibida no ERP (botão **Copiar** na aba Configurações da API). Obtenha a URL na [Parte B — ERP ISP Consultor](/doc/integracoes/asaas#parte-b). |
| **E-mail** | E-mail para alertas de falha na entrega |
| **Versão da API** | **v3** (obrigatório — o ISP Consultor usa API v3) |
| **Token de autenticação** | Clique em **Gerar Token**, copie o valor e cole no **Webhook Secret** do ERP |
| **Tipo de envio** | **Sequencial** ou **Não sequencial** — ambos funcionam |
| **Fila de sincronização ativada?** | **Sim** (padrão) |

4. Na seção **Adicionar Eventos**, expanda **Cobranças** e marque os eventos listados abaixo.

![Eventos de Cobranças](/integracoes/asaas/09-eventos-cobrancas.png)

#### Eventos de cobrança recomendados

Marque os eventos abaixo para o ERP atualizar títulos corretamente:

| Evento | Descrição |
|--------|-----------|
| `PAYMENT_CREATED` | Geração de nova cobrança |
| `PAYMENT_UPDATED` | Alteração no vencimento ou valor |
| `PAYMENT_RECEIVED` | Cobrança recebida |
| `PAYMENT_ANTICIPATED` | Cobrança antecipada |
| `PAYMENT_OVERDUE` | Cobrança vencida |
| `PAYMENT_DELETED` | Cobrança removida |
| `PAYMENT_RESTORED` | Cobrança restaurada |
| `PAYMENT_REFUNDED` | Cobrança estornada |
| `PAYMENT_RECEIVED_IN_CASH_UNDONE` | Recebimento em dinheiro desfeito |
| `PAYMENT_BANK_SLIP_CANCELLED` | Boleto cancelado por expiração |
| `PAYMENT_PARTIALLY_REFUNDED` | Cobrança estornada parcialmente |

5. Se o banco estiver com **Usar integração do banco para NFS-e = Sim**, expanda também **Notas fiscais** e marque todos os eventos da seção.

![Eventos de Notas fiscais](/integracoes/asaas/10-eventos-notas-fiscais.png)

| Evento | Descrição |
|--------|-----------|
| `INVOICE_CREATED` | Geração de nova nota fiscal |
| `INVOICE_UPDATED` | Alteração na nota fiscal |
| `INVOICE_SYNCHRONIZED` | Nota fiscal enviada para prefeitura |
| `INVOICE_AUTHORIZED` | Nota fiscal emitida |
| `INVOICE_PROCESSING_CANCELLATION` | Nota fiscal processando cancelamento |
| `INVOICE_CANCELED` | Nota fiscal cancelada |
| `INVOICE_CANCELLATION_DENIED` | Recusado o cancelamento |
| `INVOICE_ERROR` | Nota fiscal com erro |

6. Clique em **Salvar** no formulário do Asaas.

::: info Token = Webhook Secret
O **Token de autenticação** gerado no formulário do Asaas é o mesmo valor que você cola no campo **Webhook Secret** do ERP.
:::

---

### 4. Conferir entrega (Logs de Webhooks)

Após salvar, use a aba **Webhooks** do Asaas para ver:

- Status **Ativo** / **Inativo**
- **Logs de Webhooks** — histórico de tentativas, código HTTP e corpo da resposta

Se o ERP responder `401`, verifique se o **Webhook Secret** no banco coincide com o token gerado no Asaas.

---

## Parte B — ERP ISP Consultor {#parte-b}

### 1. Cadastrar o banco Asaas

1. Faça login no painel administrativo.
2. Abra **Cadastros → Bancos**.
3. Clique em **Novo** (ou edite um banco existente).

#### Aba Informações Básicas

| Campo | Valor sugerido |
|-------|----------------|
| **Nome do Banco** | Ex.: *Asaas Produção* |
| **Tipo de Banco** | **Asaas (Código: 461)** |
| **Ativo** | **Sim** |
| **Descrição** | Opcional — ex.: *Cobranças Asaas* |

#### Aba Configurações da API

| Campo | Valor |
|-------|--------|
| **URL de Retorno (Webhook)** | Copie com o botão **Copiar** e use no cadastro do webhook no Asaas |
| **Sandbox** | **Não** |
| **API Key** | Cole a chave `$aact_...` gerada no passo [2. Gerar a API Key](/doc/integracoes/asaas#gerar-api-key) |
| **Webhook Secret** | Cole o **Token de autenticação** gerado no webhook Asaas |
| **Percentual de Multa (%)** | Padrão 2,00 (ajuste se necessário) |
| **Percentual de Juros (% ao dia)** | Padrão 0,03 |
| **Incluir Taxa no Boleto** | Conforme política comercial |
| **Usar integração do banco para NFS-e** | **Sim** apenas se for usar NFS-e via Asaas com a mesma API Key |

4. Clique em **Salvar**.

::: tip URL antes de salvar
Ao criar um banco novo, salve primeiro, reabra o cadastro, copie a **URL de Retorno (Webhook)** e cadastre-a no painel Asaas.
:::

---

### 2. Vincular o banco ao contrato

1. Abra **Clientes** → selecione o cliente → aba **Contratos**.
2. No contrato, escolha o banco **Asaas** cadastrado.
3. Gere um título e confirme se o boleto/PIX é criado no Asaas.

Detalhes em [Contratos](/doc/clientes/aba-contratos).

---

## Teste ponta a ponta

1. Banco Asaas salvo com **Sandbox = Não**, API Key e Webhook Secret corretos.
2. Webhook cadastrado no Asaas com a **mesma URL** e **mesmo token** do ERP.
3. Contrato com banco Asaas → gere um título.
4. Efetue o pagamento da cobrança no Asaas (menu **Cobranças**).
5. Verifique:
   - **Logs de Webhooks** no Asaas — resposta `200`
   - Título no ERP — status atualizado para pago/recebido

---

## Solução de problemas

| Sintoma | Causa provável | Ação |
|---------|----------------|------|
| Asaas log com **401** | Webhook Secret diferente do token Asaas | Igualar **Token de autenticação** (Asaas) e **Webhook Secret** (ERP) |
| Asaas log com **401 Token não configurado** | Campo vazio no ERP | Preencher **Webhook Secret** e salvar |
| Webhook nunca chega | URL incorreta no Asaas | Conferir URL copiada do ERP e recadastrar o webhook |
| Título não atualiza | Evento não marcado no Asaas | Marcar eventos `PAYMENT_*` listados acima |
| Boleto não gera | API Key inválida | Conferir **API Key** no ERP e regenerar no Asaas se necessário |

---

## Referências externas

- [Asaas — login](https://www.asaas.com)
- [Documentação oficial Asaas — API v3](https://docs.asaas.com/)
- [Documentação Asaas — Webhooks](https://docs.asaas.com/docs/webhooks)

---

::: info Precisa de ajuda?
**Suporte ISP Consultor:** [WhatsApp (84) 99866-7245](https://wa.me/5584998667245) · [Telegram @LucasMidia](https://t.me/LucasMidia)

Ao abrir um chamado, informe empresa, ID do banco, trecho do log de webhook Asaas (sem expor API Key) e capturas da tela, se possível.
:::
