# Servidor de WhatsApp

Configuração da **API de WhatsApp** para envio de mensagens automáticas pelo ERP — cobranças, avisos e notificações.

::: info Acesso restrito
Normalmente configurado uma única vez pela equipe administrativa ou ISP Consultor.
:::

## Como acessar

1. Faça login no painel administrativo.
2. No menu lateral, abra **Integrações**.
3. Clique em **Servidor de WhatsApp**.

---

## Tipo de API e abas

O campo **Tipo de API** na aba **Servidor** define quais abas ficam disponíveis:

| Tipo de API | Abas exibidas |
|-------------|---------------|
| **Evolution API** | Servidor · Mensagens |
| **WhatsApp Cloud API (Oficial)** | Servidor · Mensagens · **Templates Meta** · **Templates** |

::: tip Alteração de tipo
Ao trocar o **Tipo de API**, salve na aba **Servidor** antes de configurar mensagens ou templates — os campos e o fluxo de envio mudam conforme o tipo escolhido.
:::

---

## Aba Servidor {#aba-servidor}

### Evolution API

| Campo | Obrigatório | Descrição |
|-------|:-----------:|-----------|
| **Tipo de API** | Sim | **Evolution API** |
| **Servidor Evolution API** | Sim | URL base da instância (ex.: `https://evo-api.example.com`) |
| **Nome da Instância** | Sim | Identificador da instância conectada |
| **Token da Instância** | Sim* | Token de autenticação (*na edição, em branco = manter o atual) |

### WhatsApp Cloud API (Oficial)

| Campo | Obrigatório | Descrição |
|-------|:-----------:|-----------|
| **Tipo de API** | Sim | **WhatsApp Cloud API (Oficial)** |
| **Token de Acesso** | Sim* | Token do Facebook Business Manager (*na edição, em branco = manter) |
| **Phone Number ID** | Sim | ID do número WhatsApp Business |
| **Business Account ID** | Não | ID da conta de negócios (opcional) |

### Teste de envio

Após salvar o servidor, use a seção **Teste** na mesma aba: informe telefone (com DDI, ex.: `5511999999999`), mensagem e clique em **Enviar**.

Clique em **Salvar** para gravar. Use **Remover** ou **Limpar** conforme o estado da configuração.

---

## Aba Mensagens {#aba-mensagens}

Configure os textos ou templates por **tipo de mensagem**. Selecione o tipo no campo **Tipo de mensagem**:

| Tipo | Uso |
|------|-----|
| 10 dias antes do vencimento | Lembrete antecipado |
| 5 dias antes do vencimento | Lembrete antecipado |
| Mesmo dia do vencimento | Aviso no vencimento |
| 5 / 10 / 15 dias após vencimento | Cobrança em atraso |
| Corte de cliente | Notificação de corte |
| Envio manual | Texto usado no envio manual pelo ERP |
| Recibo de pagamento | Confirmação de pagamento |

### Evolution API

Para cada tipo de mensagem:

| Campo | Descrição |
|-------|-----------|
| **Tipo de envio** | **Desativado** ou **PDF** (anexa boleto em PDF quando aplicável) |
| **Mensagem padrão** | Corpo da mensagem (obrigatório, exceto em *Envio manual*) |
| **Mensagem manual** | Texto do envio manual (somente tipo *Envio manual*) |
| **Interação 1 / 2 / 3** | Respostas automáticas opcionais |
| **Variáveis** | Clique para inserir placeholders do ERP (ex.: razão social do cliente, valor do título, data de vencimento) |

Clique em **Salvar** na barra superior.

### WhatsApp Cloud API (Oficial)

Para cada tipo de mensagem, vincule um **template** aprovado pela Meta (campo de seleção com botão de busca). Templates são cadastrados nas abas **Templates Meta** e **Templates**.

Clique em **Salvar** na barra superior.

---

## Aba Templates Meta {#aba-templates-meta}

Disponível apenas com **WhatsApp Cloud API (Oficial)**.

Lista os templates **aprovados na Meta** (total e aprovados). Os cards exibem nome, idioma, status, categoria, quantidade de variáveis e uma prévia do corpo da mensagem. Para cada template:

1. Clique no card para expandir.
2. Revise a **Mensagem** e a **Pré-visualização**.
3. Mapeie cada placeholder numerado da Meta (`1`, `2`, …) para variáveis do ERP (razão social, valor, vencimento etc.).
4. Clique em **Salvar template** ou **Salvar e vincular** ao tipo de mensagem selecionado.

Use **Recarregar** para atualizar a lista da Meta.

---

## Aba Templates {#aba-templates}

Disponível apenas com **WhatsApp Cloud API (Oficial)**.

Listagem dos templates **salvos no ERP** (ID, nome, idioma). Templates criados na aba **Templates Meta** aparecem aqui.

| Ação | Função |
|------|--------|
| **Deletar** | Remove o template selecionado |

Na aba **Templates Meta** ou **Templates**, o botão **Salvar** da barra principal fica desabilitado — use as ações dentro de cada aba.

---

## Monitoramento

Envios e falhas ficam registrados em [Logs de WhatsApp](/doc/logs/logs#logs-de-whatsapp) (**Logs → Comunicação**).
---

::: info Precisa de ajuda?
**Suporte ISP Consultor:** [WhatsApp (84) 99866-7245](https://wa.me/5584998667245) · [Telegram @LucasMidia](https://t.me/LucasMidia)

Ao abrir um chamado, informe empresa, usuário, tela ou módulo, passos para reproduzir e capturas ou mensagem de erro.
:::
