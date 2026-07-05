# Logs de Auditoria

Registro detalhado de **todas as ações** realizadas no ERP — criação, edição, exclusão e acessos a rotas do sistema. Diferente dos logs por módulo (Usuários, RPKI etc.), este log cobre **qualquer operação** auditável.

::: info Acesso restrito
Normalmente consultado por administradores para investigação de alterações ou conformidade.
:::

## Como acessar

1. Faça login no painel administrativo.
2. No menu lateral, abra **Parâmetros**.
3. Clique em **Logs de Auditoria**.

::: tip Outros logs
Logs específicos por área (equipamentos, comunicação, IXC, RPKI etc.) estão no menu **Logs** — veja [Logs do ERP](/doc/logs/logs).
:::

---

## Listagem

Tela de consulta (somente leitura) — não cadastra registros manualmente.

### Barra de ações

| Botão | Função |
|-------|--------|
| **Limpar** | Remove registros antigos da auditoria (ação irreversível — use com cautela) |

### Filtros

- **Ação** — tipo de operação (criar, editar, excluir, etc.)
- **Entidade** — módulo ou tabela afetada

### Busca — campos disponíveis

- ID
- Usuário/E-mail
- Usuário
- Ação
- Entidade
- IP
- Rota
- Data/Hora

---

## Quando consultar

- Investigar quem alterou ou excluiu um registro.
- Verificar acessos suspeitos ou horários de operação.
- Complementar o botão **Auditar** das listagens — que mostra histórico de um registro específico.

---

::: info Precisa de ajuda?
Consulte [Suporte e Chamados](/doc/configuracoes/suporte) para abrir um chamado com a equipe ISP Consultor.
:::
