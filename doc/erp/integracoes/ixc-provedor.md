# IXC Provedor

Guia completo para integrar o **IXC Provedor** com o ISP Consultor: configurar **grupo de usuários** e permissões no IXC, gerar o **token da API**, cadastrar a integração no ERP e sincronizar **ordens de serviço**.

## Visão geral

| Direção | O que faz |
|---------|-----------|
| **ERP → IXC (API)** | Cria, edita e executa ações em ordens de serviço |
| **IXC → ERP (sync)** | Importa/atualiza OS, filiais, setores, assuntos e mensagens |

---

## Pré-requisitos

1. Acesso administrativo ao **IXC Provedor** do cliente (painel `ixcsoft.com.br`).
2. Usuário dedicado à API com **webservice** habilitado e token no formato `id:hash`.

---

## Parte A — Painel IXC Provedor

Configure o acesso da API **antes** de cadastrar a integração no ERP. As permissões devem ser ajustadas conforme o que o ISP Consultor precisa consultar e gravar — use **Verificar permissões** no ERP (Parte B) como checklist final.

### 1. Criar grupo de usuários {#grupo-usuarios}

1. No IXC, abra **Configurações** (ícone de engrenagem).
2. Acesse **Usuários → Grupo de usuários**.
3. Clique em **Novo**.

![Criar grupo de usuários](/integracoes/ixc/01-grupo-usuarios-menu.png)

4. Na aba **Grupo**, preencha:

| Campo | Valor sugerido |
|-------|----------------|
| **Grupo** | Ex.: *ISPCONSULTOR-API* |
| **Descrição** | Ex.: *Integração ISP Consultor — API* |
| **Ativo** | **Sim** |
| **Redes permitidas** | IP público do servidor onde roda o ISP Consultor (recomendado restringir acesso) |

5. Clique em **Salvar**.

![Grupo de usuários — cadastro](/integracoes/ixc/02-grupo-usuarios-cadastro.png)

---

### 2. Permissões padrão do grupo {#permissoes-padrao}

Ainda na edição do grupo, configure **Permissões padrão do grupo** conforme abaixo. O usuário API não precisa acessar o menu visual do IXC — apenas executar ações via webservice.

| Configuração | Valor |
|--------------|-------|
| **Filtrar registros por filial** | Marcado |
| **Filtra grid de filiais** | Marcado |
| **Filtrar FiberDocs por filial** | Marcado |
| **Filtrar requisição de material** | Marcado |
| **Filtrar transferência de material com confirmação** | Marcado |
| **Filtrar O.S por cliente** | Marcado |
| **Permite atualizar software** | **Não** |
| **Menu** | **Esconder** |
| **Botões** | **Habilitar** |
| **Campos** | **Esconder** |
| **Tempo para expiração de senha** | **Nunca** (ou conforme política interna) |
| **Tempo limite sessão minutos** | **Padrão** |

![Permissões padrão do grupo](/integracoes/ixc/03-grupo-permissoes-padrao.png)

Clique em **Salvar**.

::: tip Ajuste fino
Se algum cadastro retornar **Bloqueado** ou **Dados** zerado em **Verificar permissões**, volte ao grupo e libere o formulário correspondente na aba **Permissões** (próximo passo).
:::

---

### 3. Permissões avançadas (formulários) {#permissoes-avancadas}

1. Abra a aba **Permissões → Permissões avançadas**.
2. Localize cada formulário e libere as operações indicadas na tabela abaixo.

![Permissões avançadas — exemplo Clientes](/integracoes/ixc/04-grupo-permissoes-avancadas.png)

O print acima ilustra o padrão: **Acesso** e **Menu** podem ficar **Bloqueado** (sem login no painel), mas as operações usadas pela API (**Listar**, **Novo**, **Alterar**, etc.) devem estar **Liberado** nos cadastros necessários.

#### Cadastros obrigatórios para OS e sincronização

Estes recursos são conferidos em **Integrações → IXC Provedor → Verificar permissões**:

| Cadastro (Verificar permissões) | Formulário no IXC (busca) | Listar | Novo | Alterar | Deletar |
|---------------------------------|---------------------------|:------:|:----:|:-------:|:-------:|
| **Filiais** | Filiais | Sim | — | — | — |
| **Setores** | Setores / `empresa_setor` | Sim | — | — | — |
| **Colaboradores** | Colaboradores / `funcionarios` | Sim | — | — | — |
| **Assuntos** | Assuntos OS / `su_oss_assunto` | Sim | — | — | — |
| **Estruturas** | Estruturas | Sim | — | — | — |
| **Cidades** | Cidades | Sim | — | — | — |
| **Chamados** | Ordens de serviço / `su_oss_chamado` | Sim | Sim | Sim | — |
| **Mensagens** | Mensagens OS / `su_oss_chamado_mensagem` | Sim | Sim | Sim | Sim |

#### Cadastros complementares (conforme uso)

| Formulário no IXC | Quando liberar |
|-------------------|----------------|
| **Alterar setor OS** (`su_oss_chamado_alterar_setor`) | Encaminhar e agendar OS pelo ERP |
| **Setor × Assunto**, **Funcionário × Setores** | Quando **Setores**, **Colaboradores** ou **Assuntos** retornarem **Dados** abaixo do esperado |

::: warning Ajuste conforme a operação
Nem todo provedor usa os mesmos módulos. Libere apenas o necessário para: listar cadastros de apoio, criar/editar OS, registrar mensagens e executar ações (encaminhar, agendar, finalizar). Depois valide com **Verificar permissões** no ERP.
:::

3. Clique em **Salvar** no grupo.

---

### 4. Colaborador, setor e assuntos {#colaborador-setor}

O usuário API precisa estar vinculado a um **colaborador** ativo. Esse colaborador deve pertencer ao **setor** (e **assuntos**) usados nas ordens de serviço sincronizadas pelo ISP Consultor.

#### 4.1. Cadastrar colaborador

1. No IXC, use a **busca do menu** e digite *colaborador* (ou navegue até **Folha de pagamento → Colaboradores**).
2. Clique em **Novo**.

![Colaboradores — criar](/integracoes/ixc/08-colaboradores-menu.png)

3. Na aba **Colaborador**, preencha ao menos:

| Campo | Valor |
|-------|-------|
| **Ativo** | **Sim** |
| **Nome** | Nome do colaborador operador da integração |
| **Filial** | Filial principal de atuação |

![Colaborador — cadastro](/integracoes/ixc/09-colaborador-cadastro.png)

4. Complete **Dados pessoais** e **Contato** conforme exigido pelo IXC.
5. Clique em **Salvar**.

#### 4.2. Vincular colaborador ao setor

1. Com o colaborador salvo, abra a aba **Setores**.
2. Clique em **Novo**.
3. Selecione o **Setor** desejado.
4. Defina **Listar colaborador na agenda** conforme a operação (**Não** é comum para usuário API).
5. Mantenha **Ativo = Sim** e clique em **Salvar**.

![Colaborador — vínculo com setor](/integracoes/ixc/10-colaborador-setor-vinculo.png)

#### 4.3. Setor padrão (Ordem de Serviço)

1. Ainda no cadastro do colaborador, abra a aba **Ordem de Serviço**.
2. No campo **Setor padrão**, selecione o **mesmo setor** vinculado no passo anterior.
3. Mantenha **Envia e-mail da O.S.**, **Envia SMS da O.S.** e **Integração com agenda** em **Não** para o operador da API (opcional).
4. Clique em **Salvar**.

![Colaborador — setor padrão OS](/integracoes/ixc/15-colaborador-setor-padrao-os.png)

::: tip Setor padrão
Sem **Setor padrão** definido, abertura e sincronização de OS pelo ISP Consultor podem falhar ou cair no setor errado.
:::

#### 4.4. Editar o setor — colaboradores do setor

1. Na aba **Setores** do colaborador, abra o cadastro do **Setor** (ícone de link ao lado do campo **Setor**).
2. Acesse a aba **Colaboradores** do setor.
3. Revise a lista e mantenha **somente os colaboradores** que farão parte daquele setor (incluindo o operador da API).
4. Use **Novo** para incluir ou **Editar**/**Deletar** para remover vínculos desnecessários.
5. Clique em **Salvar**.

![Setor — abrir cadastro](/integracoes/ixc/11-setor-abrir-cadastro.png)

![Setor — colaboradores vinculados](/integracoes/ixc/12-setor-colaboradores.png)

::: tip Setores, Colaboradores e Assuntos na integração
Se **Verificar permissões** no ERP retornar **Dados** zerado ou abaixo do esperado em **Setores**, **Colaboradores** ou **Assuntos**, confira o setor do operador API e os vínculos desta etapa.
:::

#### 4.5. Vincular assuntos ao setor

1. Ainda no cadastro do **Setor**, abra a aba **Assuntos**.
2. Clique em **Novo**.
3. Selecione os **assuntos** que aquele setor atende (ex.: *INFRAESTRUTURA*, *SUPORTE*, etc.).
4. Clique em **Salvar**.

![Setor — assuntos](/integracoes/ixc/13-setor-assuntos.png)

Cadastre **todos os assuntos** que o ISP Consultor usará ao abrir ou sincronizar OS naquele setor.

---

### 5. Criar usuário API e token {#token-api}

Após o colaborador e o setor estarem configurados, crie o usuário que a integração usará.

#### 5.1. Abrir cadastro de usuários

1. No IXC, abra **Configurações** (ícone de engrenagem).
2. Acesse **Usuários → Usuários**.
3. Clique em **Novo**.

![Usuários — menu](/integracoes/ixc/05-usuarios-menu.png)

#### 5.2. Dados do usuário

Na aba **Usuários**, preencha:

| Campo | Valor |
|-------|-------|
| **Grupo** | Selecione o grupo criado no passo [1](#grupo-usuarios) — ex.: *ISPCONSULTOR-API* |
| **Nome** | Identificação do usuário API — ex.: *ISP Consultor API* |
| **E-mail** | E-mail válido (obrigatório no IXC) |
| **Senha** | Senha forte (uso interno; a integração usa o token, não o login web) |
| **Status** | **Ativo** |
| **Colaborador/Responsável** | Selecione o colaborador criado no passo [4](#colaborador-setor) |

![Usuário — vínculo com colaborador](/integracoes/ixc/14-usuario-vinculo-colaborador.png)

![Usuário — cadastro](/integracoes/ixc/06-usuario-cadastro.png)

#### 5.3. Filiais

1. Acesse a aba **Filiais**.
2. Marque **todas as filiais** que o ISP Consultor deve consultar e gravar.

#### 5.4. Token da API

1. Role até a seção **API** (final do formulário) ou use **Gerar token API** na barra superior.
2. Marque **Permite acesso a API**.
3. Clique em **Copiar** no campo **Token de acesso** — formato `id:hash`.
4. Anote também a **URL da API** — ex.: `https://seu-provedor.ixcsoft.com.br/webservice/v1`.
5. Clique em **Salvar**.

![Usuário — token da API](/integracoes/ixc/07-usuario-api-token.png)

::: warning Guarde o token
Copie o token assim que gerar. Se perder, gere um novo no IXC e atualize o cadastro da integração no ERP.
:::

---

## Parte B — ERP ISP Consultor {#parte-b}

### 1. Acessar a integração

1. Faça login no painel administrativo.
2. No menu lateral, abra **Integrações**.
3. Clique em **IXC Provedor**.

---

### 2. Listagem

A tela segue o padrão de [listagens do ERP](/doc/geral/listagens). Abaixo, apenas o que é **específico** desta tela.

#### Barra de ações

| Botão | Função |
|-------|--------|
| **Novo** | Cadastra uma nova integração IXC |
| **Editar** | Altera a integração selecionada |
| **Deletar** | Remove a integração selecionada |
| **Testar integração** | Valida se a API responde |
| **Verificar permissões** | Confere credenciais e escopos de acesso |
| **Sincronizar dados OS** | Sincroniza ordens de serviço com o IXC |

::: tip Seleção de registro
As ações de teste, permissões e sincronização ficam desabilitadas até que uma integração seja selecionada na tabela.
:::

### Busca — campos disponíveis

- ID
- Nome
- URL da API

---

### 3. Cadastrar uma integração

1. Clique em **Novo**.
2. Preencha:

| Campo | Obrigatório | Descrição |
|-------|:-----------:|-----------|
| **Nome** | Sim | Identificação (ex.: *IXC Matriz*) |
| **Ativo** | Sim | Habilita ou desabilita a integração |
| **URL da API** | Sim | URL anotada no passo [5.4](#token-api) da Parte A |
| **Token da API** | Sim | Token `id:hash` copiado no passo [5.4](#token-api) da Parte A |

3. Clique em **Salvar**.
4. Use **Testar integração** e **Verificar permissões** para confirmar o acesso antes de vincular ao contrato e sincronizar OS.

---

### 4. Editar uma integração

1. Selecione a integração na listagem.
2. Clique em **Editar**.
3. Altere **Nome**, **Ativo** ou **URL da API**.
4. No **Token da API**, deixe em branco para **manter o token atual** ou informe um novo no formato `id:hash`.
5. Clique em **Salvar**.

---

### 5. Vincular ao contrato do cliente

Após cadastrar aqui, vincule a integração ao contrato:

1. Abra **Cadastros → Clientes** e edite o cliente.
2. Na aba **Contratos**, edite o contrato desejado.
3. Acesse a aba **IXC Provedor** e clique em **Novo** para selecionar a integração.

Fluxo completo em [Aba Contratos — IXC Provedor](/doc/clientes/aba-contratos#ixc-provedor).

---

### 6. Verificar permissões antes de sincronizar OS

::: warning Faça isso antes de **Sincronizar dados OS**
Se as permissões ou a quantidade de registros não estiver correta, a sincronização importará dados incompletos ou falhará. Ajuste o **usuário da API no IXC Provedor** antes de sincronizar.
:::

1. Selecione a integração na listagem.
2. Clique em **Verificar permissões**.
3. Revise a tabela exibida:

| Coluna | O que conferir |
|--------|----------------|
| **Cadastro** | Recurso consultado na API (Filiais, Setores, Colaboradores, Assuntos, Estruturas, Cidades, Chamados, Mensagens) |
| **Dados** | Quantidade de registros que a API retorna para aquele cadastro |
| **Menu** / **Listar** | Devem estar **Liberado** (verde). **Bloqueado** (vermelho) indica falta de permissão no IXC |

4. Selecione um cadastro e clique em **Dados** para abrir o detalhe — confira o **Total na API** e a lista de **Registros retornados** (amostra do que será usado na integração).
5. Compare se a quantidade e os registros batem com o que você espera importar (filiais, setores, assuntos, chamados/OS etc.).
6. Se algo estiver **Bloqueado**, com **Dados** zerado ou abaixo do esperado:
   - Volte ao [grupo de usuários](#grupo-usuarios) e [permissões avançadas](#permissoes-avancadas) no IXC.
   - Libere **Listar** (e **Novo**/**Alterar** em Chamados e Mensagens) nos formulários da tabela do passo [3](#permissoes-avancadas).
   - Confira a aba **Filiais** do usuário API (acesso às filiais corretas).
   - Confira o **setor do operador** vinculado ao usuário — passo [4](#colaborador-setor) (Setores, Colaboradores e Assuntos dependem disso).
7. Clique em **Recarregar** em **Verificar permissões** e repita a conferência até ficar adequado.
8. Só então use **Sincronizar dados OS**.

::: tip Onde executar
**Verificar permissões** e **Sincronizar dados OS** estão em **Integrações → IXC Provedor** e também na [aba IXC Provedor](/doc/clientes/aba-contratos#ixc-provedor) do contrato.
:::

---

## Relação com Ordens de Serviço

Com integração ativa, permissões conferidas e vínculo ao contrato, use **Sincronizar dados OS** para importar ou atualizar ordens de serviço do IXC no ERP. As OS sincronizadas aparecem em [Ordens de Serviço](/doc/suporte/ordens-de-servico).

Falhas na sincronização costumam aparecer em [Logs IXC — Ordens de Serviço](/doc/logs/logs#logs-ixc-ordens-de-servico).
---

::: info Precisa de ajuda?
**Suporte ISP Consultor:** [WhatsApp (84) 99866-7245](https://wa.me/5584998667245) · [Telegram @LucasMidia](https://t.me/LucasMidia)

Ao abrir um chamado, informe empresa, usuário, tela ou módulo, passos para reproduzir e capturas ou mensagem de erro.
:::
