# Abas RPKI

Orientações para consultores sobre a **gestão de RPKI** (Resource Public Key Infrastructure) de um cliente — CAs, vínculos com CA-pai, repositórios, ROAs e ASPAs.

::: tip Visão global
Para listar CAs, ROAs e demais registros de todos os clientes — e usar **Validar Rota** — acesse o menu **RPKI** no menu lateral. Veja [RPKI — visão geral](/doc/rpki/rpki).
:::

## Como acessar

1. Abra **Cadastros → Clientes**.
2. Edite o cliente desejado.
3. Use as abas **CAs**, **CAs-pai** e **Repositórios** na barra principal, ou abra o menu **⋮** para **ROAs** e **ASPAs**.

As abas só ficam disponíveis **após salvar** o cadastro do cliente.

::: tip Ordem sugerida
1. Cadastre a **CA** do cliente.
2. Configure a **CA-pai** (provisioning com a CA superior).
3. Publique no **Repositório**.
4. Crie **ROAs** e **ASPAs** conforme a necessidade de roteamento.
:::

Quando há muitas abas abertas, algumas podem aparecer no menu **⋮** (três pontos) em vez da barra principal — o conteúdo é o mesmo.

---

## Aba CAs

Lista as **Certificate Authorities** (CAs) filhas vinculadas ao cliente.

### Barra de ações

| Botão | Função |
|-------|--------|
| **Novo** | Cadastra uma nova CA |
| **Deletar** | Remove a CA selecionada |
| **Remover** | Remove a CA do servidor RPKI (operação distinta de deletar o registro local) |

### Busca — campos disponíveis

- ID
- Nome
- Handle
- Status

### Cadastrar uma CA

1. Clique em **Novo**.
2. Informe o **Nome da CA**.
3. Confirme com **Novo** no formulário.

### Editar ou remover

| Ação | Passo |
|------|--------|
| **Deletar** | Remove o registro local da CA |
| **Remover** | Remove a CA do servidor RPKI (operação no servidor, distinta de deletar o cadastro) |

---

## Aba CAs-pai

Gerencia o **provisioning** da CA filha junto à CA superior (CA-pai).

### Barra de ações

| Botão | Função |
|-------|--------|
| **Novo** | Inicia o cadastro de uma CA-pai |
| **Deletar** | Remove o registro selecionado |
| **Sincronizar** | Sincroniza o status com o servidor RPKI |

### Busca — campos disponíveis

- ID
- Nome da CA-pai
- Parent Handle
- Child Handle
- Status

### Cadastrar uma CA-pai

1. Clique em **Novo**.
2. Selecione a **CA** (CA filha já cadastrada).
3. Informe o **Nome da CA-pai**.
4. Copie a **Requisição da CA-filha** (campo somente leitura + botão **Copiar**) e envie à CA-pai externa.
5. Cole a **Resposta da CA-pai (XML)** retornada pela CA superior.
6. Salve o registro.

### Editar ou sincronizar

| Ação | Passo |
|------|--------|
| **Sincronizar** | Atualiza o status com o servidor RPKI após alterações externas |
| **Deletar** | Remove o registro local |

Para alterar a resposta XML, edite o registro (selecione → abra o formulário) e cole a nova **Resposta da CA-pai**.

---

## Aba Repositórios

Configura a **publicação** dos objetos RPKI no repositório do cliente.

### Barra de ações

| Botão | Função |
|-------|--------|
| **Novo** | Cadastra um novo repositório |
| **Deletar** | Remove o repositório selecionado |
| **Atualizar** | Atualiza o status de publicação no servidor |

### Busca — campos disponíveis

- ID
- CA
- Cliente
- Publisher Handle
- Status

### Cadastrar um repositório

1. Clique em **Novo**.
2. Selecione a **CA** e a **CA-pai** vinculadas.
3. Copie o **publisher_request** (botão **Copiar**) e envie ao repositório externo.
4. Cole a **repository_response** retornada.
5. Salve o registro.

### Editar ou atualizar

| Ação | Passo |
|------|--------|
| **Atualizar** | Sincroniza o status de publicação com o servidor |
| **Deletar** | Remove o repositório do cadastro |

---

## Aba ROAs

Gerencia os **Route Origin Authorizations** — autorizações que vinculam prefixos IP a ASNs.

Acesse pelo menu **⋮ → ROAs** quando a aba não estiver visível na barra principal.

### Barra de ações

| Botão | Função |
|-------|--------|
| **Novo** | Cria uma nova ROA |
| **Editar** | Altera a ROA selecionada |
| **Deletar** | Remove a ROA selecionada |
| **Revogar** | Revoga a ROA no servidor RPKI |
| **Analisar ROAs** | Executa análise das ROAs do cliente |
| **Validar rota** | Valida rota para a ROA selecionada |

### Busca — campos disponíveis

- ID
- CA
- Prefixo
- ASN
- Status

### Cadastrar uma ROA

| Campo | Obrigatório | Descrição |
|-------|:-----------:|-----------|
| **CA** | Sim | CA que emitirá a ROA |
| **Prefixo** | Sim | Prefixo IP — ex.: `203.0.113.0/24` ou `2001:db8::/32` |
| **ASN** | Sim | Número AS — ex.: `64500` |
| **Max Length** | Sim | Comprimento máximo do prefixo — ex.: `24` |
| **Válido de** | Sim | Data inicial de validade |
| **Válido até** | Sim | Data final de validade |

1. Clique em **Novo**, preencha os campos e **Salvar**.

### Editar ou revogar

1. Selecione a ROA → **Editar** para alterar datas ou prefixo (conforme permitido pelo status).
2. Use **Revogar** para invalidar a ROA no servidor RPKI — operação irreversível na publicação.
3. **Analisar ROAs** e **Validar rota** auxiliam na conferência antes e depois da publicação.

---

## Aba ASPAs

Gerencia **AS Provider Authorizations** — declarações de quais ASNs um cliente aceita como upstream.

Acesse pelo menu **⋮ → ASPAs**.

### Barra de ações

| Botão | Função |
|-------|--------|
| **Novo** | Cria uma nova ASPA |
| **Revogar** | Revoga a ASPA selecionada |
| **Excluir** | Remove o registro selecionado |

### Busca — campos disponíveis

- ID
- Customer ASN
- Providers

### Cadastrar uma ASPA

1. Clique em **Novo**.
2. Preencha:

| Campo | Obrigatório | Descrição |
|-------|:-----------:|-----------|
| **CA** | Sim | CA do cliente que publicará a ASPA |
| **Customer ASN** | Sim | ASN do cliente (ex.: `64500`) |
| **Providers ASN (csv)** | Sim | ASNs dos upstreams aceitos, separados por vírgula |

3. Clique em **Novo** no formulário para confirmar.

Use **Revogar** para invalidar uma ASPA publicada ou **Excluir** para remover o registro local.

---

## Boas práticas

- Confirme prefixos e ASNs com o cliente antes de publicar ROAs — erros impactam a validação de roteamento na internet.
- Mantenha as datas de validade das ROAs monitoradas; renove antes do vencimento.
- Use **Sincronizar** e **Atualizar** após alterações externas na CA-pai ou no repositório para refletir o status real no ERP.
- Documente handles e respostas XML trocadas com CA-pai e repositório na aba [Arquivos](/doc/clientes/aba-arquivos) do cliente.
---

::: info Precisa de ajuda?
**Suporte ISP Consultor:** [WhatsApp (84) 99866-7245](https://wa.me/5584998667245) · [Telegram @LucasMidia](https://t.me/LucasMidia)

Ao abrir um chamado, informe empresa, usuário, tela ou módulo, passos para reproduzir e capturas ou mensagem de erro.
:::
