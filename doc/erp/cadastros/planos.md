# Planos

Guia para cadastrar os **planos comerciais** oferecidos aos clientes pela consultoria. O plano define serviço, valor e condições usadas na criação de contratos.

::: tip Pré-requisito de contrato
Configure o plano **antes** de vincular um contrato ao cliente. Veja a [ordem sugerida](/doc/clientes/aba-contratos#ordem-sugerida).
:::

## Como acessar

1. Faça login no painel administrativo.
2. No menu lateral, abra **Cadastros**.
3. Clique em **Planos**.

## Listagem

A tela segue o padrão de [listagens do ERP](/doc/geral/listagens). Abaixo, apenas o que é **específico** do módulo Planos.

### Busca — campos disponíveis

- ID
- Nome do Plano
- Descrição
- Tipo de Serviço
- Valor Mensal
- Quantidade de Usuários
- Status

### Colunas da tabela

- **ID**
- **Nome do Plano**
- **Descrição**
- **Tipo de Serviço**
- **Valor Mensal**
- **Quantidade de Usuários**
- **Status**

---

## Cadastrar um plano

1. Na listagem, clique em **Novo**.
2. Preencha os campos da aba principal e, se necessário, as abas complementares.
3. Clique em **Salvar**.

Para descartar, use **Cancelar** ou o **X** no canto superior.

### Abas do formulário

| Aba | Conteúdo |
|-----|----------|
| *(principal)* | Dados comerciais e vigência do plano |
| Plano de Venda | Texto comercial exibido na proposta/venda |
| Observações | Anotações internas sobre o plano |

---

## Campos — aba principal {#aba-principal}

| Campo | Obrigatório | Descrição |
|-------|:-----------:|-----------|
| **Nome do Plano** | Sim | Nome identificador do plano |
| **Tipo de Serviço** | Sim | **Infraestrutura** ou **Consultoria** |
| **Descrição** | Não | Resumo do que o plano inclui |
| **Valor Mensal** | Sim | Valor cobrado mensalmente |
| **Quantidade de Usuários** | Não | Limite de usuários incluídos (padrão: 1) |
| **Data de Início** | Sim | Início da vigência comercial do plano |
| **Data de Fim** | Não | Encerramento da vigência, se houver |
| **Status** | Sim | **Sim** = plano ativo · **Não** = plano inativo |

---

## Aba Plano de Venda {#aba-plano-de-venda}

Use esta aba para montar a descrição comercial que será apresentada ao cliente na proposta ou venda do serviço.

---

## Aba Observações {#aba-observacoes}

Campo de texto livre para registrar acordos, restrições ou contexto interno sobre o plano.

---

## Editar ou excluir

1. Selecione o plano na listagem.
2. Use **Editar** ou **Deletar** conforme necessário.

::: warning
Planos vinculados a contratos ativos não devem ser excluídos sem alinhamento com a equipe — prefira inativar (Status = Não).
:::
---

::: info Precisa de ajuda?
**Suporte ISP Consultor:** [WhatsApp (84) 99866-7245](https://wa.me/5584998667245) · [Telegram @LucasMidia](https://t.me/LucasMidia)

Ao abrir um chamado, informe empresa, usuário, tela ou módulo, passos para reproduzir e capturas ou mensagem de erro.
:::
