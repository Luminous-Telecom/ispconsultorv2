# Abas Equipamentos

Orientações para consultores sobre **equipamentos de network**, **agentes de túnel** e **backups SSH** vinculados a um cliente.

::: tip Visão global
Para listar equipamentos e agentes de todos os clientes, use **Equipamentos → [Túneis (Agentes)](/doc/equipamentos/tuneis-agentes)** e **Equipamentos → [Equipamentos](/doc/equipamentos/equipamentos)** no menu lateral.
:::

## Como acessar

1. Abra **Cadastros → Clientes**.
2. Edite o cliente desejado.
3. Abra o menu **⋮** (três pontos) na barra de abas e selecione **Equipamentos**, **Túneis (agentes)** ou **Backups SSH**.

As abas só ficam disponíveis **após salvar** o cadastro do cliente.

::: tip Menu ⋮
Por limitação de espaço na barra de abas, **Equipamentos**, **Túneis (agentes)** e **Backups SSH** ficam no menu **⋮**. O conteúdo é o mesmo independentemente de onde a aba apareça.
:::

::: info Cliente já vinculado
Nas abas do cliente, o campo **Cliente** não aparece no formulário — o equipamento ou agente é automaticamente vinculado ao cliente em edição.
:::

---

## Aba Equipamentos

Lista os **dispositivos de rede** (routers, switches, etc.) cadastrados para o cliente.

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

### Cadastrar um equipamento

1. Na aba **Equipamentos**, clique em **Novo**.
2. Na sub-aba **Dados Básicos**, preencha:

| Campo | Obrigatório | Descrição |
|-------|:-----------:|-----------|
| **Agente Túnel** | Não | Agente usado para alcançar o dispositivo. Deixe vazio para SSH direto ao host |
| **Nome do dispositivo** | Sim | Identificação (ex.: *Router Matriz*) |
| **Ativo** | Sim | **Sim** = equipamento em uso · **Não** = desativado |
| **Tipo de dispositivo** | Sim | MikroTik (RouterOS), MikroTik (SwOS) ou Huawei NetEngine (VRP) |
| **IP / Host** | Sim | Endereço de acesso |
| **Porta SSH** | Sim | Padrão: 22 (SwOS usa porta HTTP) |
| **Usuário SSH** | Sim | Credencial de acesso |
| **Senha SSH** | Sim | Senha de acesso |
| **Chave Privada (PEM)** | Não | Chave OpenSSH (não disponível para SwOS) |
| **Descrição** | Não | Notas adicionais |
| **Ativar backup do equipamento** | Não | Habilita o equipamento para rotinas de backup automático da configuração |

3. Clique em **Salvar**.

Após salvar, a sub-aba **Backups SSH** lista os arquivos de backup coletados desse equipamento.

::: tip Ordem sugerida
Se o equipamento só é acessível via túnel, cadastre primeiro um **agente** na aba Túneis (agentes) e vincule-o aqui no campo **Agente Túnel**.
:::

### Editar um equipamento

1. Selecione o equipamento na listagem.
2. Clique em **Editar** (ou dê duplo clique na linha).
3. Altere os campos na sub-aba **Dados Básicos**.
4. Clique em **Salvar**.

Na edição, a **Senha SSH** pode ficar em branco para **não alterar** a senha atual. Consulte backups na sub-aba **Backups SSH** do mesmo modal.

### Excluir, testar e operar

| Ação | Passo |
|------|--------|
| **Testar** | Selecione o equipamento → **Testar** — valida SSH antes de usar em produção |
| **Terminal** | Selecione um equipamento ativo e online → **Terminal** |
| **Backup manual** | Selecione o equipamento → **Backup manual** — coleta imediata da configuração |
| **Deletar** | Selecione → **Deletar** → confirme |

---

## Aba Túneis (agentes)

Gerencia os **agentes de túnel** instalados na infraestrutura do cliente — usados para conexão remota segura com equipamentos.

### Barra de ações

| Botão | Função |
|-------|--------|
| **Novo** | Cadastra um novo agente |
| **Editar** | Altera o agente selecionado |
| **Deletar** | Remove o agente selecionado |
| **Terminal** | Abre terminal no agente selecionado (requer agente online) |
| **Testar** | Testa conectividade com o agente |
| **Status** | Menu **Ativar** / **Desativar** o agente selecionado |

### Busca — campos disponíveis

- ID
- Nome
- Cliente
- Host
- IP
- OS
- Status (Online / Offline)
- Ativo

### Cadastrar um agente

1. Na aba **Túneis (agentes)**, clique em **Novo**.
2. Na sub-aba **Configurações**, preencha:

| Campo | Obrigatório | Descrição |
|-------|:-----------:|-----------|
| **Nome do agente** | Sim | Identificação (ex.: *Servidor Produção*) |
| **Descrição** | Não | Localização, função ou notas |

3. Clique em **Salvar**.

O agente recebe um **token** de autenticação na criação. Esse token é necessário para a instalação.

### Instalar o agente no servidor

Após salvar, as sub-abas **Instalar Automático** e **Instalar Manual** ficam habilitadas.

#### Instalar Automático

O ERP conecta via SSH no servidor do cliente e executa a instalação.

1. Abra **Editar** no agente recém-criado (ou selecione e **Editar**).
2. Vá à sub-aba **Instalar Automático**.
3. Informe as credenciais SSH do **servidor onde o agente será instalado**:

| Campo | Obrigatório | Descrição |
|-------|:-----------:|-----------|
| **IP / Host do servidor** | Sim | Ex.: `192.168.1.10` |
| **Porta SSH** | Sim | Padrão: 22 |
| **Usuário SSH** | Sim | Recomendado: `root` ou usuário com sudo |
| **Senha SSH** | Condicional | Obrigatória se não usar chave privada |
| **Chave Privada PEM** | Não | Alternativa à senha |

4. Clique em **Instalar agente**.
5. Acompanhe o log na tela. Ao concluir, o status muda para **Instalação concluída** e o agente aparece como **Online** na listagem.

**Requisitos do servidor:** Linux (Debian, Ubuntu, CentOS, AlmaLinux, Rocky), acesso root ou sudo, internet para baixar dependências, Node.js 18+ (instalado automaticamente se ausente), mínimo 256 MB RAM e 500 MB disco.

#### Instalar Manual

1. Na sub-aba **Instalar Manual**, clique em **Gerar**.
2. Copie o **Comando de instalação** exibido.
3. Execute o comando como **root** no servidor do cliente.
4. Feche o modal e verifique na listagem se o agente ficou **Online**.

::: warning Token sensível
O comando manual contém o token do agente. Não compartilhe em canais públicos.
:::

### Editar um agente

1. Selecione o agente na listagem.
2. Clique em **Editar**.
3. Na sub-aba **Configurações**, altere **Nome** ou **Descrição**.
4. Clique em **Salvar**.

Na edição também é possível **Regenerar token** (invalida o token anterior — será necessário reinstalar o agente) e revisar as sub-abas de instalação.

### Ativar, desativar e excluir

| Ação | Passo |
|------|--------|
| **Ativar / Desativar** | Selecione o agente → **Status** → **Ativar** ou **Desativar** |
| **Testar** | Selecione → **Testar** — verifica comunicação com o ERP |
| **Terminal** | Selecione um agente **Online** → **Terminal** |
| **Deletar** | Selecione → **Deletar** → confirme |

---

## Aba Backups SSH

Exibe o **histórico de backups** de configuração coletados via SSH dos equipamentos do cliente.

Esta aba é somente consulta — os backups são gerados automaticamente (quando **Ativar backup do equipamento** está ativo) ou manualmente pela ação **Backup manual** na aba Equipamentos.

### Barra de ações

| Botão | Função |
|-------|--------|
| **Visualizar** | Abre o conteúdo do backup selecionado |
| **Baixar** | Faz download do arquivo de backup |
| **Deletar** | Remove o backup selecionado |

### Busca — campos disponíveis

- Equipamento
- Arquivo
- Tamanho
- Data

---

## Boas práticas

- Cadastre equipamentos com **IP** e **Nome** consistentes — facilita busca e identificação nos backups.
- Instale e teste o **agente** antes de cadastrar equipamentos que dependem de túnel.
- Use **Testar** após cadastrar equipamento ou agente, antes de depender deles em produção.
- Ative **Ativar backup do equipamento** nos dispositivos críticos e monitore a aba **Backups SSH**.
- Use **Backup manual** antes de alterações críticas na configuração de um equipamento.

---

::: info Precisa de ajuda?
Consulte [Suporte e Chamados](/doc/configuracoes/suporte) para abrir um chamado com a equipe ISP Consultor.
:::
