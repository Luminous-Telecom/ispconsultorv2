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
2. Na sub-aba **Configurações**, preencha:

| Campo | Obrigatório | Descrição |
|-------|:-----------:|-----------|
| **Cliente** | Sim | Selecione o cliente (botão de busca ao lado do campo ID) |
| **Nome do agente** | Sim | Identificação (ex.: *Servidor Produção*) |
| **Descrição** | Não | Localização, função ou notas |

3. Clique em **Salvar**.

### Instalar no servidor

Após salvar, use **Editar** no agente e acesse:

- **Instalar Automático** — o ERP instala via SSH (informe host, porta, usuário e senha/chave do servidor).
- **Instalar Manual** — clique em **Gerar**, copie o comando e execute como root no servidor.

Passo a passo completo, requisitos do servidor e cuidados com o token em [Abas Equipamentos — Túneis (agentes)](/doc/clientes/aba-equipamentos-provedor#instalar-o-agente-no-servidor).

---

## Editar um agente

1. Selecione o agente na listagem.
2. Clique em **Editar**.
3. Altere **Nome**, **Descrição** ou use **Regenerar token** na sub-aba **Configurações** (atenção: exige reinstalação).
4. Clique em **Salvar**.

Sub-abas de instalação permanecem disponíveis para agentes já cadastrados.

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
