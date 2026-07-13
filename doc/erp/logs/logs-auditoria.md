# Logs de Auditoria

Registro detalhado de **todas as ações** realizadas no ERP — criação, edição, exclusão e acessos ao sistema. Diferente dos logs por módulo (Usuários, RPKI etc.), este log cobre **qualquer operação** auditável.

::: info Acesso restrito
Normalmente consultado por administradores para investigação de alterações ou conformidade.
:::

## Como acessar

1. Faça login no painel administrativo.
2. No menu lateral, abra **Logs**.
3. Clique em **Logs de Auditoria**.

::: tip Outros logs
Logs específicos por área (equipamentos, comunicação, IXC, RPKI etc.) também estão no menu **Logs** — veja [Logs do ERP](/doc/logs/logs).
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
- **Entidade** — módulo ou registro afetado

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
**Suporte ISP Consultor:** [WhatsApp (84) 99866-7245](https://wa.me/5584998667245) · [Telegram @LucasMidia](https://t.me/LucasMidia)

Ao abrir um chamado, informe empresa, usuário, tela ou módulo, passos para reproduzir e capturas ou mensagem de erro.
:::
