# Usuários

Gestão dos **usuários** que acessam o ERP da consultoria — consultores, financeiro e administradores.

::: info Acesso restrito
Apenas usuários com perfil administrativo podem criar, editar ou excluir outros usuários.
:::

## Como acessar

1. Faça login no painel administrativo.
2. No menu lateral, abra **Parâmetros**.
3. Clique em **Usuários**.

---

## Listagem

A tela segue o padrão de [listagens do ERP](/doc/geral/listagens). Abaixo, apenas o que é **específico** desta tela.

### Barra de ações

| Botão | Função |
|-------|--------|
| **Novo** | Cadastra um novo usuário |
| **Editar** | Altera o usuário selecionado |
| **Deletar** | Remove o usuário selecionado |

### Busca — campos disponíveis

- ID
- Nome
- Email
- Perfil
- Status

---

## Cadastrar um usuário

1. Clique em **Novo**.
2. Preencha:

| Campo | Obrigatório | Descrição |
|-------|:-----------:|-----------|
| **Nome** | Sim | Nome completo do usuário |
| **Email** | Sim | E-mail usado no login |
| **Senha** | Sim | Senha de acesso (obrigatória no cadastro) |
| **Ativo** | Sim | Habilita ou bloqueia o acesso |

3. Clique em **Salvar**.

---

## Editar um usuário

1. Selecione o usuário na listagem.
2. Clique em **Editar**.
3. Altere **Nome**, **Email** ou **Ativo**.
4. Para trocar a senha, preencha o campo **Senha** (mínimo 6 caracteres). Deixe em branco para manter a senha atual.
5. Clique em **Salvar**.

Na edição também é possível **Gerar token** (Webhook secret) — credencial usada em integrações externas, como [Typebot](/doc/integracoes/typebot) e webhooks que autenticam com `Authorization: Bearer`.

---

## Boas práticas

- Desative usuários (**Ativo = Não**) em vez de excluir — preserva histórico em [Logs de Usuários](/doc/logs/logs#logs-de-usuarios).
- Use e-mails corporativos reais — facilita recuperação de acesso e auditoria.
- Revise periodicamente usuários inativos ou sem uso.

---

::: info Precisa de ajuda?
Consulte [Suporte e Chamados](/doc/configuracoes/suporte) para abrir um chamado com a equipe ISP Consultor.
:::
