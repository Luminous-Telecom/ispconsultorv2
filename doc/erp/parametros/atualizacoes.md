# Atualizações do Sistema

Modal do painel **SaaS** para consultar novidades do ERP e executar atualizações no servidor.

::: info Acesso restrito
Disponível apenas para administradores do SaaS. Alterações afetam o ambiente hospedado.
:::

## Como acessar

1. Faça login no painel **SaaS**.
2. No menu lateral, abra **Parâmetros**.
3. Clique em **Atualizações do Sistema**.

---

## Consultar novidades

Ao abrir o modal, o sistema busca a versão atual e o changelog publicado. Quando não há versões pendentes, é exibida a mensagem de que o ERP já está atualizado.

---

## Atualizar sistema

O botão **Atualizar sistema** só aparece quando há versões pendentes no changelog. Ele executa o self-update completo (pull, dependências, build, migrations e reinício do backend). Ao final, a página do ERP é recarregada automaticamente.

---

## Wiki (documentação)

Não é atualizada pelo ERP. Após o deploy do GitHub Actions, no servidor:

```bash
npm run doc:update
```

(`scripts/update-doc.sh` — git pull + restart PM2 `doc`)

---

::: info Precisa de ajuda?
**Suporte ISP Consultor:** [WhatsApp (84) 99866-7245](https://wa.me/5584998667245) · [Telegram @LucasMidia](https://t.me/LucasMidia)

Ao abrir um chamado, informe empresa, usuário, tela ou módulo, passos para reproduzir e capturas ou mensagem de erro.
:::
