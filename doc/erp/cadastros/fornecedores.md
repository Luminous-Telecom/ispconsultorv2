# Fornecedores

Guia para cadastrar **fornecedores** da consultoria — empresas ou pessoas de quem a consultoria compra serviços ou produtos. Os fornecedores são usados em **Contas a Pagar** no módulo Financeiro.

## Como acessar

1. Faça login no painel administrativo.
2. No menu lateral, abra **Cadastros**.
3. Clique em **Fornecedores**.

## Listagem

A tela segue o padrão de [listagens do ERP](/doc/geral/listagens). Abaixo, apenas o que é **específico** do módulo Fornecedores.

### Busca — campos disponíveis

- ID
- Nome/Razão Social
- Nome Fantasia
- CPF/CNPJ
- CEP
- Logradouro
- Bairro
- Cidade
- Estado
- País

---

## Cadastrar um fornecedor

1. Na listagem, clique em **Novo**.
2. Preencha as abas do formulário (detalhes abaixo).
3. Clique em **Salvar**.

### Abas do formulário

| Aba | Conteúdo |
|-----|----------|
| Dados Básicos | Tipo de pessoa, documento e identificação |
| Endereço | Endereço completo do fornecedor |
| Observações | Anotações internas |

---

## Aba Dados Básicos

| Campo | Obrigatório | Descrição |
|-------|:-----------:|-----------|
| **Tipo** | Sim | **Física** (CPF) ou **Jurídica** (CNPJ) |
| **CPF** | Sim* | Obrigatório quando tipo = Física |
| **CNPJ** | Sim* | Obrigatório quando tipo = Jurídica — formato `00.000.000/0000-00` |
| **Razão Social** | Sim | Nome jurídico ou nome completo |
| **Nome Fantasia** | Não | Nome comercial, se houver |

---

## Aba Endereço

| Campo | Descrição |
|-------|-----------|
| **CEP** | CEP no formato `00000-000` |
| **Logradouro**, **Número**, **Complemento**, **Bairro**, **Cidade**, **Estado**, **País** | Endereço completo do fornecedor |

---

## Aba Observações

Campo de texto livre para anotações internas — condições de pagamento, contatos, particularidades de negociação, etc.

---

## Editar ou excluir

1. Selecione o fornecedor na listagem.
2. Clique em **Editar** ou **Deletar**.
3. Confirme quando solicitado.

::: warning
Fornecedores vinculados a lançamentos em **Contas a Pagar** não devem ser excluídos sem verificar o histórico financeiro.
:::
---

::: info Precisa de ajuda?
**Suporte ISP Consultor:** [WhatsApp (84) 99866-7245](https://wa.me/5584998667245) · [Telegram @LucasMidia](https://t.me/LucasMidia)

Ao abrir um chamado, informe empresa, usuário, tela ou módulo, passos para reproduzir e capturas ou mensagem de erro.
:::
