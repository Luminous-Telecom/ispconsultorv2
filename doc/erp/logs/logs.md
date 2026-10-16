# Logs do ERP

Consulta de **registros operacionais** por módulo — envios de mensagem, sincronizações, acessos, equipamentos e integrações. Diferente de [Logs de Auditoria](/doc/logs/logs-auditoria), que registra alterações genéricas no sistema, cada log aqui cobre um **contexto específico**.

::: info Somente leitura
Todas as telas de logs são listagens de consulta — não cadastram registros manualmente.
:::

## Como acessar

1. Faça login no painel administrativo.
2. No menu lateral, abra **Logs**.
3. Escolha a categoria e o tipo de log desejado.

As categorias do menu lateral são:

| Pasta | Itens |
|-------|-------|
| **Logs ERP** | Usuários, Assinatura Digital, Acesso ao Sistema, Blockdomi API |
| **Comunicação** | WhatsApp, Email |
| **Equipamentos** | Equipamentos, Agentes |
| **Integrações** | IXC — Ordens de Serviço |
| **RPKI** | Sincronização, CA-pai, Repositórios |

---

## Logs de Usuários {#logs-de-usuarios}

Registra ações relacionadas a usuários do ERP — criação, edição, desativação e exclusão.

**Menu:** **Logs → Logs ERP → Logs de Usuários**

::: tip Desativar em vez de excluir
Prefira marcar o usuário como inativo em [Usuários](/doc/parametros/usuarios) para preservar o histórico neste log.
:::

---

## Logs de Assinatura Digital {#logs-de-assinatura-digital}

Eventos do fluxo de assinatura digital de contratos e documentos — envio, aceite, recusa e falhas.

**Menu:** **Logs → Logs ERP → Logs de Assinatura Digital**

Relacionado a [Assinatura Digital](/doc/integracoes/assinatura-digital).

---

## Logs de Acesso ao Sistema {#logs-de-acesso-ao-sistema}

Entradas e tentativas de login no painel administrativo — usuário, data/hora e IP.

**Menu:** **Logs → Logs ERP → Logs de Acesso ao Sistema**

Útil para investigar acessos suspeitos ou horários de operação.

---

## Logs de WhatsApp {#logs-de-whatsapp}

Histórico de envios e falhas de mensagens via servidor WhatsApp configurado.

**Menu:** **Logs → Comunicação → Logs de WhatsApp**

**Reenviar falhas** reenvia as notificações de cobrança (boleto) que ficaram com erro e cujo título ainda está em aberto. Recibos e mensagens já enviadas depois da falha não entram. Sem linha selecionada, o botão percorre as falhas do canal. Com uma linha de erro selecionada, reenvia só aquela.

Relacionado a [Servidor WhatsApp](/doc/integracoes/servidor-whatsapp).

---

## Logs de Email {#logs-de-email}

Histórico de envios e falhas de e-mails disparados pelo ERP.

**Menu:** **Logs → Comunicação → Logs de Email**

**Reenviar falhas** funciona como nos [logs de WhatsApp](/doc/logs/logs#logs-de-whatsapp): reenvia cobranças com erro de títulos ainda em aberto.

Relacionado a [Servidor Email](/doc/integracoes/servidor-email).

---

## Logs Equipamentos {#logs-equipamentos}

Operações e eventos registrados nos equipamentos cadastrados no ERP.

**Menu:** **Logs → Equipamentos → Logs Equipamentos**

Relacionado a [Equipamentos](/doc/equipamentos/equipamentos).

---

## Logs Agentes {#logs-agentes}

Atividade dos agentes instalados nos equipamentos — conexões, comandos e falhas.

**Menu:** **Logs → Equipamentos → Logs Agentes**

Relacionado a [Túneis (Agentes)](/doc/equipamentos/tuneis-agentes).

---

## Logs IXC — Ordens de Serviço {#logs-ixc-ordens-de-servico}

Sincronização de ordens de serviço com o IXC Provedor — sucesso, falhas e detalhes da integração.

**Menu:** **Logs → Integrações → Logs IXC — Ordens de Serviço**

Relacionado a [IXC Provedor](/doc/integracoes/ixc-provedor).

---

## Logs de sincronização {#logs-de-sincronizacao}

Eventos de sincronização RPKI — validação de rotas e atualização de dados.

**Menu:** **Logs → RPKI → Logs de sincronização**

Relacionado a [RPKI](/doc/rpki/rpki).

---

## Logs CA-pai {#logs-ca-pai}

Operações de publicação e comunicação com a Certificate Authority (CA) pai do RPKI.

**Menu:** **Logs → RPKI → Logs CA-pai**

---

## Logs repositórios {#logs-repositorios}

Eventos de sincronização e validação dos repositórios RPKI configurados.

**Menu:** **Logs → RPKI → Logs repositórios**
---

::: info Precisa de ajuda?
**Suporte ISP Consultor:** [WhatsApp (84) 99866-7245](https://wa.me/5584998667245) · [Telegram @LucasMidia](https://t.me/LucasMidia)

Ao abrir um chamado, informe empresa, usuário, tela ou módulo, passos para reproduzir e capturas ou mensagem de erro.
:::
