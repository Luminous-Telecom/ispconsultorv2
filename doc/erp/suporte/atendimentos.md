# Atendimentos

Gestão de **atendimentos** dos clientes com **espelho local** no ERP (`atendimentos`). Quando o cliente tem [IXC Provedor](/doc/integracoes/ixc-provedor) vinculado ao contrato, o registro é sincronizado com o webservice IXC (`su_ticket`).

## Como acessar

1. Faça login no painel administrativo.
2. No menu lateral, abra **Suporte**.
3. Clique em **Atendimentos**.

::: tip Integração IXC (opcional por cliente)
- **Com IXC no contrato:** o atendimento é gravado localmente e replicado no IXC.
- **Sem IXC no contrato:** o atendimento fica **somente local** (protocolo `AT` + data + sequência).

O **Cliente** selecionado no ERP é a chave da integração IXC (credenciais do contrato). O atendimento no IXC é sempre aberto por **estrutura** (`tipo E`), com `id_estrutura` informado no formulário.
:::

---

## Listagem

A tela segue o padrão de [listagens do ERP](/doc/geral/listagens). A listagem lê os registros da tabela local `atendimentos` (todos os status — Novo, Pendente, Em progresso, Solucionado e Cancelado). Colunas principais: protocolo, assunto, departamento, responsável, status, prioridade e última atualização.

### Barra de ações

| Botão | Função |
|-------|--------|
| **Novo** | Abre um novo atendimento |
| **Editar** | Altera o atendimento selecionado |
| **Deletar** | Remove o atendimento (local e IXC, quando houver vínculo) |

---

## Abrir um atendimento

1. Clique em **Novo**.
2. Selecione o **Cliente**.
3. Preencha a aba **Principal** (campos variam conforme integração IXC — ver abaixo).
4. Clique em **Salvar**.

Após salvar, as abas **Histórico**, **Arquivos** e **Ordens de serviço** são habilitadas (ficam inativas enquanto o atendimento ainda não foi salvo).

### Abas do formulário

| Aba | Conteúdo |
|-----|----------|
| Principal | Dados principais do chamado |
| Histórico | Mensagens e interações registradas (local ou IXC conforme origem) |
| Arquivos | Anexos do atendimento (espelho local) |
| Ordens de serviço | OS vinculadas no IXC (`id_ticket`) |

---

## Aba Principal {#aba-principal}

Os campos exibidos seguem o mesmo critério das [Ordens de Serviço](/doc/suporte/ordens-de-servico):

| Situação | Campos visíveis |
|----------|-----------------|
| **Sempre** | Cliente |
| **Cliente com IXC** (ou atendimento já vinculado ao IXC) | Estrutura, filial, descrição do assunto, departamento, técnico, status, prioridade, data reservada, melhor horário e descrição |
| **Cliente sem IXC** | Prioridade, data reservada, melhor horário e descrição (obrigatória) |

| Campo | Obrigatório | Descrição |
|-------|:-----------:|-----------|
| **Estrutura** | Sim | Local / estrutura (sempre visível) |
| **Protocolo** | — | Gerado localmente (`AT` + ano + mês + sequência); replicado no IXC quando houver integração |
| **ID** / **ID IXC** | — | ID local e ID IXC (quando sincronizado) |
| **Filial** | Sim (com IXC) | Filial no IXC |
| **Descrição do assunto** | Sim (com IXC) | Título resumido |
| **Departamento** | Sim (com IXC) | Departamento do atendimento |
| **Colaborador responsável** | Não | Responsável do atendimento (`su_ticket.id_responsavel_tecnico` → `funcionarios.id`); lista filtrada pelo **departamento** selecionado; cache local `atendimentos_tecnicos` (separado dos técnicos de OS). Gravado no IXC via **POST/PUT** em `su_ticket` (campo `id_responsavel_tecnico`). |
| **Prioridade** | Não | Baixa, Normal, Alta ou Crítica |
| **Data reservada** | Não | Agenda sugerida |
| **Melhor horário reserva** | Não | Qualquer, manhã, tarde ou noite |
| **Descrição** | Sim | Detalhamento do chamado |
| **Status** | Não | Novo, Pendente, Em progresso, Solucionado, Cancelado — disponível em atendimentos locais (sem IXC) e sincronizados com IXC |

---

## Aba Histórico {#aba-historico}

- **Atendimento local (sem IXC):** mensagens gravadas na tabela `atendimentos_mensagens`; o **Operador** é o usuário logado no ERP.
- **Atendimento com IXC:** mensagens no recurso `su_mensagens` (`id_ticket`).

| Ação | Descrição |
|------|-----------|
| **Novo** | Registrar mensagem |
| **Visualizar** | Modal somente leitura |
| **Deletar** | Exclui no IXC (com confirmação); local conforme origem |

::: warning Atendimento solucionado ou cancelado
Com status **Solucionado** (`S`) ou **Cancelado** (`C`), não é possível registrar nova mensagem. No IXC essa regra também é aplicada pela API.
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

Lista as OS vinculadas a este atendimento (local, no IXC, ou ambos), com as mesmas colunas e ações da listagem global. O botão **Novo** cria a OS já vinculada ao atendimento atual.

O vínculo é gravado no espelho local da OS (`ordens_servico.atendimento_id`) e, quando o atendimento está sincronizado com o IXC, também no ticket (`su_oss_chamado.id_ticket` = `su_ticket.id` do atendimento). Um atendimento local sem IXC também pode ter OS vinculadas — nesse caso a lista usa só o espelho local.

---

## Relação com IXC

| Recurso | Uso |
|---------|-----|
| Tabela `atendimentos` | Espelho local (listagem e atendimentos sem IXC) |
| `su_ticket` | Sincronização quando o cliente tem integração |
| `su_mensagens` | Mensagens (IXC) |
| `su_transf_atendimento` | Fallback de assunção/transferência de colaborador ou departamento |
| `su_ticket_setor` | Departamentos de atendimento (cache local `atendimentos_departamentos`) |
| `funcionarios` | Responsáveis do atendimento (cache local `atendimentos_tecnicos`; filtro por departamento) |
| `su_oss_chamado` | OS vinculadas (`id_ticket`); espelho local também guarda `atendimento_id`, `atendimento_ixc_id` e `integracao_ixc_provedor_id` |

Consulte também [IXC Provedor](/doc/integracoes/ixc-provedor) e [Ordens de Serviço](/doc/suporte/ordens-de-servico).

---

::: info Precisa de ajuda?
**Suporte ISP Consultor:** [WhatsApp (84) 99866-7245](https://wa.me/5584998667245) · [Telegram @LucasMidia](https://t.me/LucasMidia)

Ao abrir um chamado, informe empresa, usuário, tela ou módulo, passos para reproduzir e capturas ou mensagem de erro.
:::
