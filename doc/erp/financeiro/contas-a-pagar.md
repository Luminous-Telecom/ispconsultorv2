# Contas a Pagar

Gestão de **despesas e obrigações** da consultoria — contas vinculadas a [Fornecedores](/doc/cadastros/fornecedores).

## Como acessar

1. Faça login no painel administrativo.
2. No menu lateral, abra **Financeiro**.
3. Clique em **Contas a Pagar**.

---

## Listagem

A tela segue o padrão de [listagens do ERP](/doc/geral/listagens). Abaixo, apenas o que é **específico** desta tela.

### Barra de ações

| Botão | Função |
|-------|--------|
| **Novo** | Cria um novo lançamento a pagar |
| **Editar** | Altera o lançamento selecionado |
| **Deletar** | Remove o lançamento selecionado |
| **Pagar** | Registra o pagamento do lançamento |
| **Duplicar** | Cria uma cópia do lançamento selecionado |

::: tip Seleção de registro
**Editar**, **Deletar**, **Pagar** e **Duplicar** ficam desabilitados até que um registro seja selecionado.
:::

### Filtro por período

- **Data Inicial** e **Data Final** — restringe a listagem ao intervalo informado

### Busca — campos disponíveis

- ID
- Número do Documento
- Nota Fiscal
- Fornecedor
- Vencimento
- Valor
- Status
- Tipo de Pagamento

---

## Cadastrar um lançamento

1. Clique em **Novo**.
2. Preencha o formulário:

| Campo | Obrigatório | Descrição |
|-------|:-----------:|-----------|
| **Fornecedor** | Sim | Selecione na busca (cadastre antes em [Fornecedores](/doc/cadastros/fornecedores)) |
| **Tipo de criação** | Sim | **Única** — um lançamento · **Lote** — vários vencimentos no intervalo |
| **Data de vencimento** | Sim* | Obrigatória quando tipo = **Única** |
| **Data inicial / final** | Sim* | Obrigatórias quando tipo = **Lote** — gera um lançamento por mês no intervalo |
| **Valor** | Sim | Valor de cada parcela |
| **Tipo de pagamento** | Sim | PIX, Dinheiro, Boleto, Cartão, Depósito, Débito em conta ou Transferência |
| **Linha digitável** | Não | Aparece quando tipo = **Boleto** |
| **Tipo de chave PIX / Chave PIX** | Não | Aparecem quando tipo = **PIX** |
| **Número do documento** | Não | Referência interna |
| **Nota fiscal** | Não | Número da NF vinculada |
| **Descrição / Observações** | Não | Texto livre |

3. Clique em **Salvar**.

::: tip Lote mensal
No modo **Lote**, informe data inicial e final — o sistema cria um lançamento por mês entre essas datas, todos com o mesmo valor e fornecedor.
:::

---

## Editar um lançamento

1. Selecione o lançamento na listagem.
2. Clique em **Editar**.
3. Altere os campos necessários (tipo de criação não aparece na edição).
4. Clique em **Salvar**.

Use **Duplicar** para criar uma cópia do lançamento selecionado como ponto de partida.

---

## Registrar pagamento

1. Selecione o lançamento na listagem.
2. Clique em **Pagar**.
3. Preencha:

| Campo | Obrigatório | Descrição |
|-------|:-----------:|-----------|
| **Data de pagamento** | Sim | Data em que o pagamento foi efetuado |
| **Desconto (%) / Desconto (R$)** | Não | Reduz o valor em aberto |
| **Acréscimo (%) / Acréscimo (R$)** | Não | Aumenta o valor em aberto |
| **Valor total** | Não | Sobrescreve o cálculo automático, se informado |
| **Observação** | Não | Notas sobre a baixa |

4. Clique em **Confirmar pagamento**.

---

::: info Precisa de ajuda?
Consulte [Suporte e Chamados](/doc/configuracoes/suporte) para abrir um chamado com a equipe ISP Consultor.
:::
