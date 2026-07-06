# Servidor de E-Mail

Configuração do **servidor SMTP** usado pelo ERP para enviar e-mails — boletos, cobranças, notificações e demais mensagens automáticas.

::: info Acesso restrito
Normalmente configurado uma única vez pela equipe administrativa ou ISP Consultor.
:::

## Como acessar

1. Faça login no painel administrativo.
2. No menu lateral, abra **Parâmetros**.
3. Clique em **Servidor de E-Mail**.

---

## Aba Servidor {#aba-servidor}

| Campo | Obrigatório | Descrição |
|-------|:-----------:|-----------|
| **Host SMTP** | Sim | Endereço do servidor (ex.: `smtp.gmail.com`) |
| **Porta** | Sim | Porta SMTP (587, 465 etc.) |
| **Usuário/E-mail** | Sim | Conta de autenticação SMTP |
| **Senha** | Não | Senha ou app password da conta |
| **Nome do Remetente** | Sim | Nome exibido ao destinatário |
| **E-mail do Remetente** | Sim | Endereço remetente visível |
| **Segurança** | — | **Usar SSL** e/ou **Usar TLS** conforme o cliente |
| **Timeout (ms)** | Não | Tempo limite de conexão |

Clique em **Salvar** após configurar. Use **Remover** para limpar a configuração existente.

---

## Aba Mensagens {#aba-mensagens}

Personalização dos **textos padrão** dos e-mails enviados pelo sistema (assunto e corpo das mensagens automáticas). Edite conforme orientação da equipe ISP Consultor.

---

## Monitoramento

Envios e falhas ficam registrados em [Logs de Email](/doc/logs/logs#logs-de-email) (**Logs → Comunicação**).
---

::: info Precisa de ajuda?
**Suporte ISP Consultor:** [WhatsApp (84) 99866-7245](https://wa.me/5584998667245) · [Telegram @LucasMidia](https://t.me/LucasMidia)

Ao abrir um chamado, informe empresa, usuário, tela ou módulo, passos para reproduzir e capturas ou mensagem de erro.
:::
