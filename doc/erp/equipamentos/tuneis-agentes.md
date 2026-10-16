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
| WireGuard | Configura a VPN no MikroTik do cliente pela API HTTP (disponível após salvar) |

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
- Conexão com a internet (para baixar Docker e os arquivos do agente)
- Docker e Docker Compose (instalados automaticamente se ausentes)
- Imagem montada localmente a partir do ISP Consultor (sem Docker Hub)
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

Gera um comando de instalação para executar manualmente no servidor **Linux**.

1. O comando é gerado automaticamente ao abrir a aba (ou clique em **Gerar**).
2. Copie o campo **Comando de instalação**.
3. Execute o comando como **root** no servidor — o script instala Docker (se necessário), baixa os arquivos do agente e sobe o container conforme indicado no comando.

::: warning Token no comando
O comando gerado inclui o **token do agente** — não compartilhe em locais públicos. Abrir a URL no navegador **não** funciona.
:::

::: tip Windows
O comando da aba **Instalar Manual** é para Linux. Para instalar em **Windows**, siga [Instalar no Windows](#instalar-no-windows).
:::

Passo a passo completo, requisitos do servidor e cuidados com o token em [Abas Equipamentos — Túneis (agentes)](/doc/clientes/aba-equipamentos-provedor#instalar-o-agente-no-servidor).

---

## Aba WireGuard {#aba-wireguard}

Use esta aba quando o cliente **não tem servidor Linux nem Windows** e o acesso à rede passa pelo **MikroTik**. O painel configura a interface WireGuard no roteador pela API HTTP. O ISP Consultor entra como cliente da VPN e, com o túnel no ar, o backup e o terminal SSH dos equipamentos usam esse caminho.

O MikroTik precisa ser **RouterOS 7**, com IP público (a porta UDP do WireGuard acessível na internet) e a API web alcançável a partir do servidor do ISP Consultor.

1. Cadastre o agente e clique em **Salvar**.
2. Abra a aba **WireGuard**.
3. Preencha:

| Campo | Obrigatório | Descrição |
|-------|:-----------:|-----------|
| **IP / Host da API** | Sim | Endereço em que a API do MikroTik responde |
| **Porta da API** | Sim | Padrão: 80. Use a porta do serviço `www` ou `www-ssl` |
| **HTTPS** | Sim | **Sim** se a API for HTTPS |
| **Usuário da API** | Sim | Usuário com permissão de escrita em interface, IP e firewall |
| **Senha da API** | Sim | Na reedição, em branco mantém a senha já salva |
| **Porta UDP WireGuard** | Sim | Porta em que o MikroTik escuta. Padrão: 13231 |
| **Redes da LAN** | Sim | Redes atrás do MikroTik, separadas por vírgula. Ex.: `192.168.88.0/24` |

4. Clique em **Configurar VPN**.
5. Se o handshake concluir, o status fica **up**. O painel mostra o IP deste servidor, o IP do MikroTik na VPN e as chaves públicas.

No equipamento, preencha **Agente Túnel** com este agente e use o **IP de LAN** do dispositivo (não o IP público). O backup (`/export` no RouterOS, ou o arquivo `.swb` no SwOS) e o terminal seguem pela VPN.

::: warning API e porta UDP
A API precisa estar acessível **antes** do primeiro **Configurar VPN**. A porta UDP informada precisa aceitar conexão vinda da internet. No RouterOS 6 não há REST nem WireGuard.
:::

---

## Instalar no Windows {#instalar-no-windows}

As abas **Instalar Automático** e **Instalar Manual** do painel são voltadas a **servidores Linux**. Em **Windows**, use **Docker Desktop**.

### O que não funciona no Windows

| Recurso do painel | Windows |
|-------------------|---------|
| **Instalar Manual** (comando gerado pelo painel) | Não — script para Linux |
| **Instalar Automático** (SSH) | Não — assume servidor Linux |

### Requisitos

- Windows 10, Windows 11 ou Windows Server com suporte a containers
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) instalado e em execução
- Conexão com a internet
- Mínimo: 256 MB RAM, 500 MB disco

### Passos

1. Cadastre o agente em **Equipamentos → Túneis (Agentes)** (ou na aba do cliente) e clique em **Salvar**.
2. Abra **Editar** → aba **Configurações** e copie o **token** exibido (use **Gerar token** se necessário).
3. Entre em contato com o **Suporte ISP Consultor** para receber o pacote e as instruções de instalação no Windows com Docker Desktop.

::: warning Token sensível
Não compartilhe o token em canais públicos. Se regenerar o token no painel, será necessário reinstalar o agente no servidor com o valor novo.
:::

Após a instalação, o agente deve aparecer como **Online** no painel em alguns segundos.

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
