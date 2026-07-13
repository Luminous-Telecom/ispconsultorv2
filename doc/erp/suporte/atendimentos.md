# Atendimentos

Gestão de **atendimentos** dos clientes no ERP. Quando o cliente tem [IXC Provedor](/doc/integracoes/ixc-provedor) vinculado ao contrato, os dados são sincronizados com o IXC; sem IXC, o atendimento fica apenas no ERP.

## Como acessar

1. Faça login no painel administrativo.
2. No menu lateral, abra **Suporte**.
3. Clique em **Atendimentos**.

::: tip Integração IXC (opcional por cliente)
- **Com IXC no contrato:** o atendimento é gravado no ERP e replicado no IXC Provedor.
- **Sem IXC no contrato:** o atendimento fica **somente no ERP** (protocolo `AT` + data + sequência).

Preencha o campo **Estrutura** no formulário quando o cliente tiver IXC vinculado.
:::

---

## Listagem

A tela segue o padrão de [listagens do ERP](/doc/geral/listagens). A listagem exibe todos os atendimentos (Novo, Pendente, Em progresso, Solucionado e Cancelado). Colunas principais: protocolo, assunto, departamento, responsável, status, prioridade e última atualização.

### Barra de ações

| Botão | Função |
|-------|--------|
| **Novo** | Abre um novo atendimento |
| **Editar** | Altera o atendimento selecionado |
| **Deletar** | Remove o atendimento (no ERP e no IXC, quando houver vínculo) |
| **Imprimir** | Gera PDF do atendimento selecionado (um registro por vez) |
| **Ações** | Menu com **Interagir** (nova mensagem + alteração de status) e **Abrir OS** (cria ordem de serviço vinculada sem abrir o formulário do atendimento) |

#### Ações (um atendimento selecionado)

| Opção | Descrição |
|-------|-----------|
| **Interagir** | Abre modal para registrar mensagem e alterar o **status** do atendimento (mesmo fluxo do IXC Provedor). Indisponível quando o status é **Solucionado** ou **Cancelado**. |
| **Abrir OS** | Abre diretamente o formulário de nova ordem de serviço já vinculada ao atendimento (cliente, filial e estrutura pré-preenchidos). Não é necessário editar o atendimento nem ir na aba Ordens de serviço. |

---

## Abrir um atendimento

1. Clique em **Novo**.
2. Selecione o **Cliente**.
3. Preencha a aba **Principal** (campos variam conforme integração IXC — ver abaixo).
4. Clique em **Salvar**.

Após salvar, as abas **Histórico**, **Arquivos** e **Ordens de serviço** são habilitadas (ficam inativas enquanto o atendimento ainda não foi salvo).

### Imprimir PDF {#imprimir-pdf}

1. Selecione **um** atendimento na listagem.
2. Clique em **Imprimir** na barra de ações.

O ERP gera um PDF com **modelo fixo do sistema**: cabeçalho da empresa, dados do cliente, dados do atendimento, descrição inicial e **tabela com todas as interações** do histórico (data, operador e mensagem). Não é necessário cadastrar modelo em **Modelos de Documentos**.

### Abas do formulário

| Aba | Conteúdo |
|-----|----------|
| Principal | Dados principais do chamado |
| Histórico | Mensagens e interações registradas |
| Arquivos | Anexos do atendimento |
| Ordens de serviço | OS vinculadas a este atendimento |

---

## Aba Principal {#aba-principal}

Os campos exibidos seguem o mesmo critério das [Ordens de Serviço](/doc/suporte/ordens-de-servico):

| Situação | Campos visíveis |
|----------|-----------------|
| **Sempre** | Cliente |
| **Cliente com IXC** (ou atendimento já vinculado ao IXC) | Estrutura, filial, descrição do assunto, departamento, técnico, prioridade, data reservada, melhor horário e descrição |
| **Cliente sem IXC** | Prioridade, data reservada, melhor horário e descrição (obrigatória) |
| **Edição** (atendimento já salvo) | **Status** somente leitura — a alteração de status é feita ao **Interagir** (nova mensagem) |

| Campo | Obrigatório | Descrição |
|-------|:-----------:|-----------|
| **Estrutura** | Sim | Local / estrutura (sempre visível) |
| **Protocolo** | — | Gerado automaticamente (`AT` + ano + mês + sequência); replicado no IXC quando houver integração |
| **ID** / **ID IXC** | — | ID no ERP e ID no IXC (quando sincronizado) |
| **Filial** | Sim (com IXC) | Filial no IXC |
| **Descrição do assunto** | Sim (com IXC) | Título resumido |
| **Departamento** | Sim (com IXC) | Departamento do atendimento |
| **Colaborador responsável** | Não | Responsável do atendimento; a lista é filtrada pelo **departamento** selecionado |
| **Prioridade** | Não | Baixa, Normal, Alta ou Crítica |
| **Data reservada** | Não | Agenda sugerida |
| **Melhor horário reserva** | Não | Qualquer, manhã, tarde ou noite |
| **Descrição** | Sim | Detalhamento do chamado |
| **Status** | — | Exibido somente leitura na edição. Para alterar, use **Ações → Interagir** na listagem ou **Interagir** na aba Histórico |

---

## Aba Histórico {#aba-historico}

Mensagens registradas no ERP (operador = usuário logado) ou sincronizadas do IXC Provedor, conforme a origem do atendimento.

| Ação | Descrição |
|------|-----------|
| **Interagir** | Registrar mensagem e alterar o status do atendimento (modal com campos **Status** e **Mensagem**) |
| **Visualizar** | Modal somente leitura |
| **Deletar** | Exclui a mensagem (com confirmação) |

::: warning Atendimento solucionado ou cancelado
Com status **Solucionado** ou **Cancelado**, não é possível registrar nova mensagem.
:::

---

## Aba Arquivos {#aba-arquivos}

Disponível após salvar o atendimento. Lista os arquivos anexados, com busca por **ID**, **Descrição** ou **Arquivo**.

| Ação | Função |
|------|--------|
| **Novo** | Anexa um arquivo (campos **Arquivo** e **Descrição** — obrigatórios) |
| **Visualizar** | Pré-visualiza o arquivo (imagens e PDF); indisponível para tipos não suportados |
| **Baixar** | Baixa o(s) arquivo(s) selecionado(s) |
| **Deletar** | Remove o(s) arquivo(s) selecionado(s) (com confirmação) |

---

## Aba Ordens de serviço {#aba-ordens-de-servico}

Lista as OS vinculadas a este atendimento, com as mesmas colunas e ações da listagem global. O botão **Novo** cria a OS já vinculada ao atendimento atual.

Atendimentos sem IXC também podem ter OS vinculadas no ERP.

Consulte também [IXC Provedor](/doc/integracoes/ixc-provedor) e [Ordens de Serviço](/doc/suporte/ordens-de-servico).

---

::: info Precisa de ajuda?
**Suporte ISP Consultor:** [WhatsApp (84) 99866-7245](https://wa.me/5584998667245) · [Telegram @LucasMidia](https://t.me/LucasMidia)

Ao abrir um chamado, informe empresa, usuário, tela ou módulo, passos para reproduzir e capturas ou mensagem de erro.
:::
