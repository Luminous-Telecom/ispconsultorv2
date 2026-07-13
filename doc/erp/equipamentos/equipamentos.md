# Equipamentos

Visão **global** de todos os **dispositivos de rede** (routers, switches etc.) gerenciados pela consultoria via SSH. Para operar equipamentos de um cliente específico, use também a [Aba Equipamentos](/doc/clientes/aba-equipamentos-provedor#aba-equipamentos) no cadastro do cliente.

## Como acessar

1. Faça login no painel administrativo.
2. No menu lateral, abra **Equipamentos**.
3. Clique em **Equipamentos**.

---

## Listagem

A tela segue o padrão de [listagens do ERP](/doc/geral/listagens). Abaixo, apenas o que é **específico** desta tela.

### Barra de ações

| Botão | Função |
|-------|--------|
| **Novo** | Cadastra um novo equipamento |
| **Editar** | Altera o equipamento selecionado |
| **Deletar** | Remove o equipamento selecionado |
| **Terminal** | Abre terminal remoto no equipamento selecionado |
| **Testar** | Testa conectividade SSH com o equipamento |
| **Backup manual** | Dispara backup imediato da configuração |

### Busca — campos disponíveis

- ID
- Nome
- IP
- Tipo

---

## Cadastrar um equipamento

1. Clique em **Novo**.
2. Preencha a aba **Dados Básicos** (detalhes abaixo).
3. Clique em **Salvar**.

Após salvar, a aba **Backups SSH** passa a exibir o histórico de backups desse equipamento.

### Abas do formulário

| Aba | Conteúdo |
|-----|----------|
| Dados Básicos | Cadastro e credenciais de acesso do equipamento |
| Backups SSH | Histórico de arquivos de backup (disponível após salvar) |

---

## Aba Dados Básicos {#aba-dados-basicos}

| Campo | Obrigatório | Descrição |
|-------|:-----------:|-----------|
| **Cliente** | Sim | Selecione o cliente (botão de busca ao lado do campo ID) |
| **Agente Túnel** | Não | Agente para alcançar o dispositivo. Vazio = SSH direto |
| **Nome do dispositivo** | Sim | Identificação (ex.: *Router Matriz*) |
| **Ativo** | Sim | **Sim** / **Não** |
| **Tipo de dispositivo** | Sim | MikroTik (RouterOS), MikroTik (SwOS) ou Huawei NetEngine (VRP) |
| **IP / Host** | Sim | Endereço de acesso SSH |
| **Porta SSH** | Sim | Padrão: 22 |
| **Usuário SSH** | Sim | Credencial de acesso |
| **Senha SSH** | Sim | Senha de acesso (na edição, em branco = manter a senha atual) |
| **Chave Privada (PEM)** | Não | Chave OpenSSH (não disponível para SwOS) |
| **Descrição** | Não | Notas adicionais |
| **Ativar backup do equipamento** | Não | Habilita backup automático da configuração |

::: tip SwOS
Para **MikroTik (SwOS)**, os campos usam porta e credenciais **HTTP** em vez de SSH, e a chave privada não se aplica.
:::

---

## Aba Backups SSH {#aba-backups-ssh}

Disponível somente com o equipamento já salvo. Lista os arquivos de backup gerados no servidor, com busca por **Arquivo**, **Tamanho** ou **Data**.

| Ação | Função |
|------|--------|
| **Visualizar** | Abre o conteúdo do backup (somente arquivos de texto: `.rsc`, `.txt`, `.cfg`, `.conf`, `.log`) |
| **Baixar** | Baixa o(s) arquivo(s) selecionado(s) |
| **Deletar** | Remove o(s) backup(s) selecionado(s) do servidor (com confirmação) |

::: tip Sem backups?
Se a lista estiver vazia, confirme que **Ativar backup do equipamento** está marcado na aba **Dados Básicos** e aguarde o próximo backup automático — ou dispare um agora com **Backup manual** na listagem ou no cabeçalho do modal **Editar equipamento** (ao lado de **Salvar**).
:::

---

## Editar um equipamento

1. Selecione o equipamento na listagem.
2. Clique em **Editar**.
3. Altere os campos necessários na aba **Dados Básicos**.
4. Clique em **Salvar**.

No cabeçalho do modal de edição também há **Terminal**, **Testar** e **Backup manual** (ao lado de **Salvar**). **Terminal** e **Testar** não estão disponíveis para MikroTik (SwOS). Ao concluir o backup manual, o sistema abre a aba **Backups SSH** para conferir o arquivo gerado.

Backups ficam na aba **Backups SSH** do mesmo modal.

---

## Testar, terminal, backup e excluir

| Ação | Passo |
|------|--------|
| **Testar** | Selecione → **Testar** — valida conectividade |
| **Terminal** | Selecione equipamento acessível → **Terminal** |
| **Backup manual** | Selecione → **Backup manual** |
| **Deletar** | Selecione → **Deletar** → confirme |

Backups do cliente também podem ser consultados na aba **Backups SSH** do cadastro do cliente.

---

## Diferença em relação à aba do cliente

| Tela | Escopo | Cliente no formulário |
|------|--------|------------------------|
| **Equipamentos → Equipamentos** | Todos os dispositivos | Campo **Cliente** obrigatório |
| **Clientes → aba Equipamentos** | Um cliente | Cliente já vinculado — campo oculto |

Guia passo a passo completo: [Abas Equipamentos](/doc/clientes/aba-equipamentos-provedor).
---

::: info Precisa de ajuda?
**Suporte ISP Consultor:** [WhatsApp (84) 99866-7245](https://wa.me/5584998667245) · [Telegram @LucasMidia](https://t.me/LucasMidia)

Ao abrir um chamado, informe empresa, usuário, tela ou módulo, passos para reproduzir e capturas ou mensagem de erro.
:::
