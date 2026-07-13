# Ordens de Serviço

Gestão de **ordens de serviço (OS)** dos clientes — abertura manual, acompanhamento de status e histórico. OS também podem ser **sincronizadas** do IXC quando há integração configurada.

## Como acessar

1. Faça login no painel administrativo.
2. No menu lateral, abra **Suporte**.
3. Clique em **Ordens de Serviço**.

::: tip Sincronização IXC
1. Configure [IXC Provedor](/doc/integracoes/ixc-provedor) e vincule ao contrato.
2. Use **Verificar permissões** e confira se a quantidade em **Dados** está de acordo com o que deseja importar (ajuste o usuário da API no IXC Provedor do cliente, se necessário).
3. Só então execute **Sincronizar dados OS** — em **Integrações → IXC Provedor** ou na [aba IXC do contrato](/doc/clientes/aba-contratos#ixc-provedor).

Detalhes em [Verificar permissões antes de sincronizar OS](/doc/integracoes/ixc-provedor#verificar-permissoes-antes-de-sincronizar-os).
:::

---

## Listagem

A tela segue o padrão de [listagens do ERP](/doc/geral/listagens). Abaixo, apenas o que é **específico** desta tela.

### Barra de ações

| Botão | Função |
|-------|--------|
| **Novo** | Abre uma nova ordem de serviço |
| **Editar** | Altera a OS selecionada |
| **Deletar** | Remove a OS selecionada |
| **Imprimir** | Gera PDF da OS selecionada (um registro por vez) |
| **Ações** | Menu com operações adicionais sobre a OS selecionada |

::: tip Seleção de registro
Editar, Deletar, Imprimir e Ações ficam desabilitados até que uma OS seja selecionada na tabela. **Imprimir** exige exatamente um registro selecionado.
:::

### Busca — campos disponíveis

- ID
- Cliente
- Operador
- Estrutura
- Descrição
- Protocolo
- Status

---

## Abrir uma ordem de serviço

1. Clique em **Novo**.
2. Selecione o **Cliente** (busca ao lado do campo ID).
3. Preencha a aba **Principal** (detalhes abaixo).
4. Clique em **Salvar**.

Após salvar, as abas **Histórico** e **Arquivos** são habilitadas (ficam inativas enquanto a OS ainda não foi salva).

### Imprimir PDF

1. Selecione **uma** ordem de serviço na listagem.
2. Clique em **Imprimir** na barra de ações e escolha o layout:
   - **Padrão (padrão)** — modelo embutido do sistema
   - **Modelos cadastrados** — layouts personalizados em **Cadastros → Modelos de Documentos → Ordens de serviço**

O PDF substitui as variáveis pelos dados da OS, do cliente e da empresa.

### Abas do formulário

| Aba | Conteúdo |
|-----|----------|
| Principal | Dados principais da OS |
| Histórico | Mensagens e interações registradas (disponível após salvar) |
| Arquivos | Anexos vinculados à OS (disponível após salvar) |

---

## Aba Principal {#aba-principal}

### Cliente com integração IXC

| Campo | Obrigatório | Descrição |
|-------|:-----------:|-----------|
| **Filial** | Sim | Busca no IXC do cliente |
| **Estrutura** | Sim | Local ou ponto da OS |
| **Assunto** | Sim | Tipo de solicitação |
| **Setor** | Sim | Setor responsável |
| **Técnico** | Não | Colaborador designado |
| **Prioridade** | Não | Baixa, Normal, Alta ou Crítica |
| **Melhor horário** | Não | Qualquer, Manhã, Tarde ou Noite |
| **Data agenda** | Não | Data/hora agendada |
| **Mensagem / Descrição** | Não | Detalhes da solicitação |

### Cliente sem integração IXC

Somente **Cliente** e **Mensagem / Descrição** (obrigatória) são exibidos — a OS fica registrada localmente no ERP.

Em OS sincronizadas do IXC, campos como **Protocolo** e **ID IXC** aparecem somente leitura na edição.

---

## Aba Histórico {#aba-historico}

Disponível somente com a OS já salva. Lista as mensagens e eventos registrados, com busca por **Evento**, **Operador** ou **Mensagem**.

| Ação | Função |
|------|--------|
| **Novo** | Registra uma nova mensagem manual (campo **Mensagem**, até 10.000 caracteres) |
| **Visualizar** | Exibe os detalhes da mensagem selecionada (somente leitura) |
| **Deletar** | Remove a(s) mensagem(ns) selecionada(s) (com confirmação) |

---

## Aba Arquivos {#aba-arquivos}

Disponível somente com a OS já salva. Lista os arquivos anexados, com busca por **ID**, **Descrição** ou **Arquivo**.

| Ação | Função |
|------|--------|
| **Novo** | Anexa um arquivo (campos **Arquivo** e **Descrição** — obrigatórios) |
| **Visualizar** | Pré-visualiza o arquivo (imagens e PDF); indisponível para tipos não suportados |
| **Baixar** | Baixa o(s) arquivo(s) selecionado(s) |
| **Deletar** | Remove o(s) arquivo(s) selecionado(s) (com confirmação) |

---

## Editar uma ordem de serviço

1. Selecione a OS na listagem.
2. Clique em **Editar**.
3. Altere os campos na aba **Principal** e **Salvar**.

Em OS sincronizadas do IXC, campos como **Protocolo** e **ID IXC** aparecem somente leitura. OS locais (sem IXC) podem ser excluídas enquanto não estiverem **Finalizadas**.

---

## Ações sobre a OS

Com uma OS selecionada, use o menu **Ações**:

| Ação | Uso |
|------|-----|
| **Agendar** | Define ou altera agendamento |
| **Encaminhar** | Encaminha para outro setor/técnico |
| **Executar** | Marca início da execução |
| **Finalizar** | Encerra a OS |
| **Reabrir** | Reabre OS finalizada |
| **Registrar mensagem** | Adiciona interação ao histórico |

::: warning Reabrir no IXC Phoenix
Em alguns tenants IXC (ex.: Phoenix/Fenix), o ERP exibe a ação **Reabrir** e envia a requisição corretamente, mas o IXC pode responder *"Não é possível prosseguir, esta O.S. já foi finalizada."* — limitação ou permissão do IXC do cliente, não falha de sincronização do ERP. Nesse caso a OS permanece **Finalizada** no IXC e no espelho local.
:::

::: tip OS local vs. IXC
OS criadas **apenas no ERP** (cliente sem IXC) permitem **Registrar mensagem** e **Finalizar**. OS vinculadas ao IXC disponibilizam o fluxo completo acima.
:::

---

## Boas práticas

- Vincule sempre a OS ao **Cliente** correto para facilitar busca e relatórios.
- Use a sincronização IXC para manter OS alinhadas ao IXC do cliente, evitando duplicidade manual.
- Consulte o **Histórico** antes de alterar status — preserva rastreabilidade do atendimento.
---

::: info Precisa de ajuda?
**Suporte ISP Consultor:** [WhatsApp (84) 99866-7245](https://wa.me/5584998667245) · [Telegram @LucasMidia](https://t.me/LucasMidia)

Ao abrir um chamado, informe empresa, usuário, tela ou módulo, passos para reproduzir e capturas ou mensagem de erro.
:::
