# Aba Financeiro

Orientações para consultores sobre **títulos, boletos e pagamentos** de um cliente — visão consolidada de todos os contratos vinculados.

## Como acessar

1. Abra **Cadastros → Clientes**.
2. Edite o cliente desejado.
3. Clique na aba **Financeiro**.

A aba só fica disponível **após salvar** o cadastro do cliente.

::: tip Onde gerar títulos
Os títulos recorrentes do contrato são criados em **Contratos → Editar contrato → aba Financeiro → Gerar Financeiro**. A aba Financeiro do cliente serve para **consultar e operar** os títulos já existentes.
:::

---

## Listagem

A tela segue o padrão de [listagens do ERP](/doc/geral/listagens). Abaixo, apenas o que é **específico** desta aba.

### Barra de ações

| Botão | Função |
|-------|--------|
| **Editar** | Abre o título selecionado para alteração |
| **Deletar** | Remove o título selecionado |
| **Receber** | Registra a baixa (pagamento) do título |
| **Cancelar** | Cancela o título selecionado |
| **Estornar** | Estorna um pagamento já registrado |
| **Imprimir** | Menu de impressão (veja abaixo) |
| **Enviar** | Envia a cobrança ao cliente (e-mail/WhatsApp, conforme configuração) |
| **NFS-e** | Ações de nota fiscal de serviço eletrônica |

::: tip Seleção de registro
A maioria das ações fica desabilitada até que um título seja selecionado na tabela.
:::

### Imprimir — opções do menu

| Opção | Função |
|-------|--------|
| **Selecionados** | Imprime os títulos marcados na listagem |
| **Abertos** | Imprime títulos em aberto do cliente |
| **Recibo** | Gera recibo do título pago selecionado |

No **celular**, use o menu **⋮** do card do título: **Selecionados** imprime aquele título. No preview do PDF, use **Baixar** (o visualizador embutido no celular costuma não oferecer download).

### Busca — campos disponíveis

- ID
- Número do Título
- Status
- Valor
- Valor Pago
- Data de Vencimento
- Data de Pagamento
- ID da Cobrança
- Nosso Número

### Filtro

- **Mostrar cancelados** — exibe também títulos cancelados na listagem

### Colunas da tabela

- **ID**
- **Contrato** — contrato de origem do título
- **Status**
- **Plano**
- **Vencimento**
- **Valor**
- **Valor baixado** — valor já recebido
- **Valor aberto** — saldo pendente
- **NF** — número da NFS-e, quando emitida
- **Status NF**
- **Data de Pagamento**
- **ID da Cobrança** — identificador na integração bancária (EFI/Asaas)
- **Nosso Número** — número do boleto
- **Data cadastro**

---

## Editar um título

1. Selecione o título na listagem.
2. Clique em **Editar**.
3. Altere os campos permitidos e clique em **Salvar**.

| Campo | Na edição |
|-------|-----------|
| Cliente, contrato, plano, nosso número | Somente leitura |
| **Valor** | Editável apenas se o título **não** foi registrado no banco |
| **Vencimento** | Editável apenas se o título **não** foi registrado no banco |
| **Observações** | Sempre editável |

Títulos gerados pela rotina **Gerar Financeiro** do contrato seguem as mesmas regras — veja [Aba Contratos — Financeiro](/doc/clientes/aba-contratos#financeiro).

---

## Receber um pagamento

1. Selecione o título na listagem.
2. Clique em **Receber**.
3. Preencha:

| Campo | Obrigatório | Descrição |
|-------|:-----------:|-----------|
| **Data de pagamento** | Sim | Não pode ser futura |
| **Valor pago** | Sim | Valor recebido |
| **Observações** | Não | Até 500 caracteres |

4. Clique em **Receber**.

Use **Estornar** para desfazer uma baixa registrada incorretamente — o título volta ao status pendente.

---

## Cancelar um título

1. Selecione o título.
2. Clique em **Cancelar**.
3. Confirme quando solicitado.

Títulos cancelados ficam ocultos por padrão. Marque **Mostrar cancelados** para visualizá-los.

---

## Enviar cobrança e NFS-e

Com um título selecionado:

- **Enviar** — dispara a cobrança ao cliente pelos canais configurados (servidor de e-mail ou WhatsApp em **Parâmetros**).
- **NFS-e → Gerar NFS-e Avulsa** — abre o formulário de emissão vinculado ao título (cliente e valor pré-preenchidos). Requer [NFS-e](/doc/integracoes/nfse) configurada.
- **Imprimir → Imprimir NF** — disponível quando o título já possui NFS-e emitida.

Notas emitidas também podem ser consultadas em **Financeiro → [Notas Fiscais](/doc/financeiro/notas-fiscais)**.

---

::: warning Alterações sensíveis
Cancelar ou estornar títulos com cobrança já enviada ao banco pode exigir ajuste manual na integração. Em caso de dúvida, alinhe com a equipe antes de prosseguir.
:::
---

::: info Precisa de ajuda?
**Suporte ISP Consultor:** [WhatsApp (84) 99866-7245](https://wa.me/5584998667245) · [Telegram @LucasMidia](https://t.me/LucasMidia)

Ao abrir um chamado, informe empresa, usuário, tela ou módulo, passos para reproduzir e capturas ou mensagem de erro.
:::
