# Túneis (Agentes)

Visão **global** de todos os **agentes de túnel** cadastrados na consultoria — usados para conexão remota segura com a infraestrutura dos clientes. Para operar agentes de um cliente específico, use também a [Aba Túneis (agentes)](/doc/clientes/aba-equipamentos-provedor#aba-tuneis-agentes) no cadastro do cliente.

## Como acessar

1. Faça login no painel administrativo.
2. No menu lateral, abra **Equipamentos**.
3. Clique em **Túneis (Agentes)**.

::: tip Relação com equipamentos
Os equipamentos SSH podem ser vinculados a um **Agente Túnel** no cadastro do dispositivo. Veja [Equipamentos](/doc/equipamentos/equipamentos).
:::

---

## Listagem

A tela segue o padrão de [listagens do ERP](/doc/geral/listagens). Abaixo, apenas o que é **específico** desta tela.

### Barra de ações

| Botão | Função |
|-------|--------|
| **Novo** | Cadastra um novo agente |
| **Editar** | Altera o agente selecionado |
| **Deletar** | Remove o agente selecionado |
| **Terminal** | Abre terminal remoto no agente selecionado (requer online) |
| **Testar** | Testa conectividade com o agente |
| **Status** | Menu **Ativar** / **Desativar** |

### Busca — campos disponíveis

- ID
- Nome
- Cliente
- Host
- IP
- OS
- Status (Online / Offline)
- Ativo

### Colunas principais

- **Status** — Online ou Offline
- **Host / IP / OS** — preenchidos após o agente conectar
- **Última conexão** — timestamp da última comunicação

---

## Cadastrar um agente

1. Clique em **Novo**.
2. Na aba **Configurações**, preencha:

| Campo | Obrigatório | Descrição |
|-------|:-----------:|-----------|
| **Cliente** | Sim | Selecione o cliente (botão de busca ao lado do campo ID) |
| **Nome do agente** | Sim | Identificação (ex.: *Servidor Produção*) |
| **Descrição** | Não | Localização, função ou notas |

3. Clique em **Salvar**.

Ao salvar, as abas **Instalar Automático** e **Instalar Manual** são habilitadas — o modal muda automaticamente para **Instalar Manual**, já tentando gerar o comando de instalação.

### Abas do formulário

| Aba | Conteúdo |
|-----|----------|
| Configurações | Dados do agente e token |
| Instalar Automático | Instalação via SSH direto do painel (disponível após salvar) |
| Instalar Manual | Comando para instalação manual no servidor (disponível após salvar) |

---

## Aba Configurações {#aba-configuracoes}

Campos de cadastro (tabela acima). Na **edição**, exibe também:

| Campo | Descrição |
|-------|-----------|
| **Token** | Token de autenticação do agente (somente leitura) |

Use **Gerar token** para invalidar o token atual e gerar um novo — atenção: exige reinstalação do agente no servidor.

---

## Aba Instalar Automático {#aba-instalar-automatico}

O ERP se conecta ao servidor via SSH e instala o agente automaticamente.

**Requisitos do servidor:**

- Linux (Debian, Ubuntu, CentOS, AlmaLinux, Rocky)
- Acesso root ou sudo
- Conexão com a internet (para baixar Node.js e dependências)
- Node.js 18+ (instalado automaticamente se ausente)
- Mínimo: 256 MB RAM, 500 MB disco

| Campo | Obrigatório | Descrição |
|-------|:-----------:|-----------|
| **IP / Host do servidor** | Sim | Endereço do servidor onde o agente será instalado |
| **Porta SSH** | Não | Padrão: 22 |
| **Usuário SSH** | Não | Padrão: root |
| **Senha SSH** | Não* | Deixe em branco se usar chave privada |
| **Chave Privada PEM** | Não* | Alternativa à senha |

Clique em **Instalar Agente** para iniciar — acompanhe o log em tempo real. Ao concluir, o modal indica **Instalação concluída!** ou **Falha na instalação**.

---

## Aba Instalar Manual {#aba-instalar-manual}

Gera um comando de instalação para executar manualmente no servidor.

1. O comando é gerado automaticamente ao abrir a aba (ou clique em **Gerar**).
2. Copie o campo **Comando de instalação**.
3. Execute o comando como **root** no servidor.

::: warning Token no comando
O comando gerado inclui o **token do agente** — não compartilhe em locais públicos.
:::

Passo a passo completo, requisitos do servidor e cuidados com o token em [Abas Equipamentos — Túneis (agentes)](/doc/clientes/aba-equipamentos-provedor#instalar-o-agente-no-servidor).

---

## Editar um agente

1. Selecione o agente na listagem.
2. Clique em **Editar**.
3. Altere **Nome**, **Descrição** ou use **Gerar token** na aba **Configurações** (atenção: exige reinstalação).
4. Clique em **Salvar**.

Abas de instalação permanecem disponíveis para agentes já cadastrados.

---

## Ativar, testar e excluir

| Ação | Passo |
|------|--------|
| **Status → Ativar / Desativar** | Selecione o agente → **Status** → escolha a opção |
| **Testar** | Selecione → **Testar** |
| **Terminal** | Selecione agente **Online** → **Terminal** |
| **Deletar** | Selecione → **Deletar** → confirme |

---

## Diferença em relação à aba do cliente

| Tela | Escopo | Cliente no formulário |
|------|--------|------------------------|
| **Equipamentos → Túneis (Agentes)** | Todos os agentes | Campo **Cliente** obrigatório — selecione na busca |
| **Clientes → aba Túneis (agentes)** | Um cliente | Cliente já vinculado — campo oculto |

Demais campos, instalação e ações são idênticos. Guia detalhado: [Abas Equipamentos](/doc/clientes/aba-equipamentos-provedor).
---

::: info Precisa de ajuda?
**Suporte ISP Consultor:** [WhatsApp (84) 99866-7245](https://wa.me/5584998667245) · [Telegram @LucasMidia](https://t.me/LucasMidia)

Ao abrir um chamado, informe empresa, usuário, tela ou módulo, passos para reproduzir e capturas ou mensagem de erro.
:::
