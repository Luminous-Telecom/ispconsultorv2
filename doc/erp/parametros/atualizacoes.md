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

## Atualizar documentação

Use **Atualizar documentação** quando quiser publicar apenas alterações da wiki (`doc/`), sem atualizar o ERP.

O processo executa, nesta ordem:

1. `git pull` (branch `main`) — traz o `doc/.vitepress/dist/` já buildado pelo GitHub Actions
2. Validação dos assets do dist no servidor
3. Reinício do processo PM2 **`doc`** (wiki) e purga opcional do cache Cloudflare

**Não** recompila VitePress no servidor. **Não** são alterados: backend, frontend do ERP, migrations, banco de dados nem demais serviços PM2. A página do ERP **não** é recarregada ao concluir.

Confirme a ação no aviso exibido antes de iniciar. O progresso e os logs aparecem no corpo do modal.

---

## Atualizar sistema

O botão **Atualizar sistema** só aparece quando há versões pendentes no changelog. Ele executa o self-update completo (pull, dependências, build, migrations e reinício do backend). Ao final, a página do ERP é recarregada automaticamente.

---

::: info Precisa de ajuda?
**Suporte ISP Consultor:** [WhatsApp (84) 99866-7245](https://wa.me/5584998667245) · [Telegram @LucasMidia](https://t.me/LucasMidia)

Ao abrir um chamado, informe empresa, usuário, tela ou módulo, passos para reproduzir e capturas ou mensagem de erro.
:::
