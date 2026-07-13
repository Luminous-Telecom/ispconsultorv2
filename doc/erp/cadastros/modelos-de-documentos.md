# Modelos de Documentos

Cadastro dos **templates de documentos** usados pelo ERP — contratos comerciais, termos de adesão, modelos auxiliares (recibos, cartas de cobrança) e **impressão personalizada de ordens de serviço**. A impressão de **atendimentos** usa modelo fixo do sistema (não editável aqui).

::: tip Pré-requisito de contrato
Cadastre os modelos **antes** de vincular contratos. Veja a [ordem sugerida](/doc/clientes/aba-contratos#ordem-sugerida).
:::

## Como acessar

1. Faça login no painel administrativo.
2. No menu lateral, abra **Cadastros**.
3. Clique em **Modelos de Documentos**.

A tela possui três abas principais: **Contratos**, **Termos** e **Ordens de serviço**.

---

## Aba Contratos {#aba-contratos}

Modelos do **contrato comercial** e sub-documentos (adesão, permanência, recibos, cobrança).

A listagem segue o padrão de [listagens do ERP](/doc/geral/listagens).

### Busca — campos disponíveis

- ID
- Nome
- Tipo
- Status

### Cadastrar um modelo de contrato

1. Na aba **Contratos**, clique em **Novo**.
2. Preencha os dados gerais e edite o conteúdo nas sub-abas de documento.
3. Clique em **Salvar**.

| Campo | Obrigatório | Descrição |
|-------|:-----------:|-----------|
| **Nome** | Sim | Nome do modelo (ex.: *Contrato Padrão*) |
| **Descrição** | Não | Breve descrição do uso |
| **Cliente para Teste** | Não | Cliente usado na pré-visualização |

#### Sub-abas de conteúdo

| Sub-aba | Uso |
|---------|-----|
| **Modelo Contrato** | Corpo principal do contrato comercial |
| **Termo Adesão** | Termo de adesão ao serviço |
| **Contrato Permanência** | Cláusulas de permanência mínima |
| **Recibos** | Modelo de recibos |
| **Carta de Cobrança** | Modelo de carta de cobrança |

Use **Imprimir** para visualizar o documento (após salvar) e **Cliente para Teste** para pré-visualizar com dados de um cliente.

### Editar um modelo

1. Selecione o modelo na listagem.
2. Clique em **Editar**.
3. Altere nome, descrição ou conteúdo nas sub-abas.
4. Clique em **Salvar**.

::: warning
Modelos referenciados por contratos ativos não devem ser excluídos — crie uma nova versão ou inative o antigo.
:::

---

## Aba Termos {#aba-termos}

Modelos de **termos adicionais** vinculados aos contratos — adesão, permanência, políticas etc. Usados na [aba Termos](/doc/clientes/aba-contratos#termos) do modal de contrato.

### Busca — campos disponíveis

- ID
- Nome
- Tipo
- Status

### Cadastrar um termo

1. Selecione a aba **Termos**.
2. Clique em **Novo**, preencha o conteúdo e **Salvar**.
3. No contrato do cliente, vincule o termo em **Contratos → aba Termos → Novo**.

### Editar um termo

1. Selecione o termo na aba **Termos**.
2. Clique em **Editar**, altere o conteúdo e **Salvar**.

Vínculos já usados em contratos ativos devem ser alterados com cuidado — prefira criar uma nova versão do termo quando o conteúdo legal mudar.

---

## Aba Ordens de serviço {#aba-ordens-de-servico}

Modelos de **impressão em PDF** das ordens de serviço. Usados pelo botão **Imprimir** na listagem de [Ordens de Serviço](/doc/suporte/ordens-de-servico).

### Cadastrar um modelo

1. Selecione a aba **Ordens de serviço**.
2. Clique em **Novo**, preencha **Nome** e **Descrição** (opcional).
3. No campo **Modelo padrão**, escolha **Padrão** para carregar o layout pré-definido no editor — ou monte o conteúdo manualmente.
4. Use o painel **Variáveis** à direita para inserir campos dinâmicos (grupos **Dados do Cliente**, **Dados da Empresa** e **Dados da Ordem de Serviço**).
5. Clique em **Salvar**.

### Modelo padrão embutido

O layout **Padrão** traz cabeçalho com título e dados da OS, blocos de cliente, detalhes do atendimento, laudo técnico e área de assinatura — sem logo fixa (a empresa pode incluir `#empresa.logo#` ao personalizar).

Na impressão da listagem de OS, esse modelo aparece no menu **Imprimir** como **Padrão (padrão)**, além dos modelos **cadastrados** nesta aba.

### Variáveis da ordem de serviço

| Variável | Descrição |
|----------|-----------|
| `#ordem.id#` | ID da ordem de serviço |
| `#ordem.protocolo#` | Protocolo |
| `#ordem.status#` | Status |
| `#ordem.prioridade#` | Prioridade |
| `#ordem.mensagem#` | Descrição / mensagem |
| `#ordem.mensagem_resposta#` | Mensagem de resposta |
| `#ordem.data_abertura#` | Data de abertura |
| `#ordem.data_agenda#` | Data agendada |
| `#ordem.data_final#` | Data final |
| `#ordem.data_fechamento#` | Data de fechamento |
| `#ordem.endereco#` | Endereço |
| `#ordem.bairro#` | Bairro |
| `#ordem.complemento#` | Complemento |
| `#ordem.referencia#` | Referência |
| `#ordem.tecnico#` | Técnico |
| `#ordem.assunto#` | Assunto |
| `#ordem.setor#` | Setor |
| `#ordem.filial#` | Filial |
| `#ordem.estrutura#` | Estrutura |
| `#ordem.cidade#` | Cidade |

O primeiro modelo **ativo** cadastrado é usado quando a impressão não especifica um layout. Use **Imprimir** no editor (após salvar) para pré-visualizar o layout.

::: info Atendimentos
A impressão de **atendimentos** usa um **modelo fixo do sistema** (dados do chamado + histórico de interações). Não há cadastro de modelo editável para atendimentos nesta tela. Veja [Atendimentos](/doc/suporte/atendimentos#imprimir-pdf).
:::

---

::: info Precisa de ajuda?
**Suporte ISP Consultor:** [WhatsApp (84) 99866-7245](https://wa.me/5584998667245) · [Telegram @LucasMidia](https://t.me/LucasMidia)

Ao abrir um chamado, informe empresa, usuário, tela ou módulo, passos para reproduzir e capturas ou mensagem de erro.
:::
