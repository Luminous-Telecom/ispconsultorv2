# Backups

Cópia de segurança da instalação: banco de dados, arquivos enviados e logs. Também restaura um backup já gerado ou importado.

::: info Acesso restrito
Disponível apenas para usuários com perfil **administrador**, em **Parâmetros → Backups**.
:::

## Como acessar

1. Faça login no painel administrativo com um usuário administrador.
2. No menu lateral, abra **Parâmetros**.
3. Clique em **Backups**.

---

## Gerar um backup

Na parte superior da tela, escolha o tipo:

| Tipo | O que inclui |
|------|----------------|
| **Banco de Dados** | Dados do sistema |
| **Arquivos** | Arquivos enviados (logos, anexos e demais arquivos da instalação) |
| **Logs** | Registros de log do servidor |
| **Completo (BD + Arquivos + Logs)** | Os três juntos |

O backup entra na fila e aparece na lista quando termina.

## Importar, baixar, restaurar e excluir

1. **Importar** — envia um arquivo `.sql`, `.tar.gz`, `.ndjson` ou `.txt` já existente.
2. **Baixar** — salva o arquivo no computador.
3. **Restaurar** — aplica o backup na instalação. Confirme com atenção: a restauração substitui os dados atuais.
4. **Excluir** — remove o arquivo de backup do servidor. Não apaga os dados que já estão em uso.

A lista permite buscar, ordenar e atualizar.

---

## Impacto nos módulos

- **Completo** e **Banco de Dados** afetam todos os módulos (clientes, contratos, financeiro, equipamentos e parâmetros).
- **Arquivos** inclui anexos de clientes e arquivos da empresa.
- A restauração vale para a instalação inteira, não para um único cadastro.

---

::: info Precisa de ajuda?
**Suporte ISP Consultor:** [WhatsApp (84) 99866-7245](https://wa.me/5584998667245) · [Telegram @LucasMidia](https://t.me/LucasMidia)

Ao abrir um chamado, informe empresa, usuário, tela ou módulo, passos para reproduzir e capturas ou mensagem de erro.
:::
