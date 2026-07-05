# Dashboard

Painel inicial exibido após o login — consolida indicadores operacionais e financeiros da consultoria em um único lugar.

## Como acessar

O dashboard é a **tela inicial** do painel administrativo (`/adm`). Para voltar a ele a qualquer momento, feche as janelas abertas pelo menu lateral (botão **Fechar**) ou acesse novamente a URL principal do ERP.

---

## Indicadores exibidos

### Clientes e contratos

| Widget | Descrição |
|--------|-----------|
| **Base de clientes** | Total de clientes cadastrados, com contagem por status (Ativo / Inativo) |
| **Status dos Contratos** | Contratos ativos, inativos, suspensos e isentos |
| **Distribuição por Tipo de Plano** | Quantidade de contratos por categoria de plano |
| **Novos Clientes (12 meses)** | Evolução de novos clientes no período |
| **Clientes por Plano** | Detalhamento gráfico por plano comercial |

Os cards são **clicáveis** — abrem a listagem filtrada correspondente (ex.: clientes ativos, contratos em atraso).

### Financeiro

| Widget | Descrição |
|--------|-----------|
| **Status dos Pagamentos** | Títulos pagos, em atraso etc. |
| **Recebidos (mês atual)** | Valor já recebido no mês corrente |
| **A Receber (mês atual)** | Valor pendente de recebimento no mês |
| **Faturamento Mensal (12 meses)** | Gráfico de faturamento ao longo do ano |
| **A Pagar (12 meses)** | Gráfico de despesas no período |

### Equipamentos

| Widget | Descrição |
|--------|-----------|
| **Status backups equipamentos** | Resumo dos backups SSH recentes — indica falhas ou ausência de eventos no período |

---

## Busca rápida no dashboard

No topo da tela há um campo de busca de **clientes** com seletor de campo (ID, CNPJ, Razão Social, Nome Fantasia, Email, Status). Use para localizar um cliente sem abrir o menu **Cadastros → Clientes**.

---

## Boas práticas

- Consulte o dashboard diariamente para identificar contratos em atraso ou backups ausentes.
- Clique nos cards para ir direto à listagem filtrada — evita navegação manual pelo menu.
- Valores financeiros refletem os títulos registrados em [Contas A Receber](/doc/financeiro/contas-a-receber) e [Contas a Pagar](/doc/financeiro/contas-a-pagar).

---

::: info Precisa de ajuda?
Consulte [Suporte e Chamados](/doc/configuracoes/suporte) para abrir um chamado com a equipe ISP Consultor.
:::
