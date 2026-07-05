# Tipo de Cobrança

Guia para definir **como os boletos são gerados** por contrato: quantidade de títulos e intervalo entre eles (periodicidade).

::: tip Pré-requisito de contrato
Configure o tipo de cobrança **antes** de criar contratos. Veja a [ordem sugerida](/doc/clientes/aba-contratos#ordem-sugerida).
:::

## Como acessar

1. Faça login no painel administrativo.
2. No menu lateral, abra **Cadastros**.
3. Clique em **Tipo de Cobrança**.

## Listagem

A tela segue o padrão de [listagens do ERP](/doc/geral/listagens). Abaixo, apenas o que é **específico** do módulo.

### Busca — campos disponíveis

- ID
- Nome
- Quantidade de títulos

### Colunas da tabela

- **ID**
- **Nome**
- **Quantidade de títulos** — quantos boletos serão emitidos pelo contrato
- **Periodicidade** — intervalo entre os títulos (ex.: Mensal)
- **Status**

---

## Cadastrar um tipo de cobrança

1. Na listagem, clique em **Novo**.
2. Preencha os campos abaixo.
3. Clique em **Salvar**.

### Campos do formulário

| Campo | Obrigatório | Descrição |
|-------|:-----------:|-----------|
| **Nome** | Sim | Identificação do tipo (ex.: *12 parcelas mensais*, *3x*) |
| **Quantidade de títulos** | Sim | Número de boletos gerados por contrato (ex.: 3, 12) |
| **Periodicidade** | Sim | Intervalo entre títulos: **Mensal**, **Bimestral**, **Trimestral**, **Semestral**, **Anual**, **Quinzenal** ou **Semanal** |
| **Status** | Sim | **Sim** = tipo ativo · **Não** = tipo inativo |

::: tip Exemplo
Um tipo chamado **3x** com **3 títulos** e periodicidade **Mensal** gera três boletos, um por mês, ao criar o contrato.
:::

---

## Editar ou excluir

1. Selecione o registro na listagem.
2. Use **Editar** ou **Deletar** conforme necessário.

::: warning
Tipos em uso por contratos ativos não devem ser excluídos — prefira inativar.
:::

---

::: info Precisa de ajuda?
Consulte [Suporte e Chamados](/doc/configuracoes/suporte) para abrir um chamado com a equipe ISP Consultor.
:::
