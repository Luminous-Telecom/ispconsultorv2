# Modelos de Documentos

Cadastro dos **templates de documentos** usados pelo ERP — contratos comerciais, termos de adesão e modelos auxiliares (recibos, cartas de cobrança).

::: tip Pré-requisito de contrato
Cadastre os modelos **antes** de vincular contratos. Veja a [ordem sugerida](/doc/clientes/aba-contratos#ordem-sugerida).
:::

## Como acessar

1. Faça login no painel administrativo.
2. No menu lateral, abra **Cadastros**.
3. Clique em **Modelos de Documentos**.

A tela possui duas abas principais: **Contratos** e **Termos**.

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

::: info Precisa de ajuda?
**Suporte ISP Consultor:** [WhatsApp (84) 99866-7245](https://wa.me/5584998667245) · [Telegram @LucasMidia](https://t.me/LucasMidia)

Ao abrir um chamado, informe empresa, usuário, tela ou módulo, passos para reproduzir e capturas ou mensagem de erro.
:::
