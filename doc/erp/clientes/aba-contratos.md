# Aba Contratos

Orientações para consultores sobre a **criação e gestão de contratos** com os clientes.

---

## Antes de criar um contrato

Antes de vincular um contrato a um cliente, configure os cadastros abaixo. Sem eles, o contrato não pode ser gerado corretamente nem emitir boletos.

| Pré-requisito | Documentação | Menu no ERP |
|--------------|--------------|-------------|
| **Cliente cadastrado** | [Clientes](/doc/clientes/cadastro-cliente) | **Cadastros → Clientes** |
| **Plano** | [Planos](/doc/cadastros/planos) | **Cadastros → Planos** |
| **Dias de vencimento** | [Dias de Vencimento](/doc/parametros/dias-vencimento) | **Parâmetros → Dias de Vencimento** |
| **Banco** | [Bancos](/doc/cadastros/bancos) | **Cadastros → Bancos** |
| **Tipo de cobrança** | [Tipo de Cobrança](/doc/cadastros/tipo-cobranca) | **Cadastros → Tipo de Cobrança** |
| **Modelo de contrato** | [Documentos do Sistema](/doc/parametros/documentos-do-sistema) | **Parâmetros → Documentos do Sistema → Contratos** |

### Ordem sugerida

1. Cadastre o **cliente** em Clientes.
2. Crie o **plano** com o serviço e valor acordados.
3. Configure os **dias de vencimento** disponíveis.
4. Cadastre o **banco** que emitirá os boletos.
5. Defina o **tipo de cobrança** (quantidade de títulos e periodicidade).
6. Cadastre o **modelo de contrato** na aba Contratos de Documentos do Sistema.
7. Só então crie o contrato (veja abaixo).

---

## Onde criar um contrato

Existem dois caminhos:

| Caminho | Quando usar |
|---------|-------------|
| **Cadastros → Clientes → aba Contratos** | Forma recomendada — o cliente já vem vinculado ao contrato |
| **Cadastros → Contratos → Novo** | Visão global de todos os contratos da empresa |

Para criar pela aba do cliente:

1. Abra **Cadastros → Clientes**.
2. Edite o cliente desejado.
3. Clique na aba **Contratos**.
4. Clique em **Novo**.

A aba **Contratos** só fica disponível **após salvar** o cadastro do cliente.

---

## Criar um contrato — passo a passo

1. Abra o formulário de novo contrato (por um dos caminhos acima).
2. Na aba **Dados do Contrato**, preencha os campos obrigatórios.
3. Revise a aba **Endereço** (pode usar o endereço do cliente ou informar outro).
4. Clique em **Salvar**.

Após salvar, as abas **Termos**, **Financeiro**, **Financeiro Avulso**, **Serviços Adicionais** e **IXC Provedor** ficam habilitadas para consulta e gestão.

---

## Aba Dados do Contrato

| Campo | Obrigatório | Descrição |
|-------|:-----------:|-----------|
| **Plano** | Sim | Plano comercial vinculado — selecione pela listagem (ícone de busca) |
| **Status** | Sim | **Ativo**, **Inativo** ou **Suspenso** |
| **Data de Início** | Sim | Início da vigência do contrato |
| **Data de Fim** | Não | Encerramento programado, se houver |
| **Dia de Vencimento** | Sim | Dia do mês para vencimento dos boletos (somente dias habilitados em [Dias de Vencimento](/doc/parametros/dias-vencimento)) |
| **Banco para Boleto** | Sim | Conta emissora dos boletos |
| **Tipo de Cobrança** | Sim | Define quantidade e periodicidade dos títulos |
| **Desconto Percentual (%)** | Não | Desconto percentual sobre o valor |
| **Desconto Valor (R$)** | Não | Desconto em reais |
| **Data Validade Desconto** | Não | Até quando o desconto é válido |
| **Isento** | Não | **Sim** = cliente isento de cobrança · **Não** = cobrança normal |
| **Modelo de Contrato** | Sim | Template do documento contratual |
| **Observações** | Não | Anotações sobre o contrato |

::: tip Seleção de cadastros
Campos como **Plano**, **Banco**, **Tipo de Cobrança** e **Modelo de Contrato** usam o seletor com botão **Abrir listagem de registros** — busque pelo nome ou ID do cadastro.
:::

---

## Aba Endereço

| Campo | Descrição |
|-------|-----------|
| **Usar endereço do cliente** | **Sim** = copia o endereço do cliente · **Não** = informar manualmente |
| **Endereço**, **Número**, **Complemento**, **Bairro**, **Cidade**, **UF** | Endereço de faturamento/cobrança do contrato |

---

## Listagem na aba Contratos do cliente

Dentro de **Cadastros → Clientes → Editar → Contratos**, a listagem segue o padrão de [listagens do ERP](/doc/geral/listagens).

### Barra de ações

| Botão | Função |
|-------|--------|
| **Novo** | Abre o formulário de novo contrato |
| **Editar** | Edita o contrato selecionado |
| **Deletar** | Remove o contrato selecionado |
| **Imprimir** | Gera impressão do contrato selecionado |

### Busca — campos disponíveis

- ID
- Plano
- Status
- Valor Final
- Desconto %
- Valor do Desconto
- Banco para Boleto
- Endereço, Cidade, Estado

### Filtro

- **Mostrar inativos** — exibe contratos com status inativo

---

## Abas após salvar

Após salvar o contrato, abra-o com **Editar** para acessar as abas abaixo.

### Termos

Vincula **termos adicionais** ao contrato (adesão, permanência etc.), cadastrados previamente em **Parâmetros → Documentos do Sistema → aba Termos**. Veja [Documentos do Sistema](/doc/parametros/documentos-do-sistema).

#### Listagem

| Botão | Função |
|-------|--------|
| **Novo** | Vincula um termo cadastrado ao contrato |
| **Editar** | Altera o vínculo do termo selecionado |
| **Deletar** | Remove o termo do contrato |
| **Imprimir** | Imprime o termo selecionado |
| **Assinatura** | Envia ou registra a assinatura digital do termo |

**Busca:** ID, Nome do Termo, Assinado, Aceito Por, Status.

#### Vincular um termo

1. Clique em **Novo**.
2. Selecione o **Termo Cadastrado** na listagem (modelos de **Documentos do Sistema → Termos**).
3. Defina **Ativo** (**Sim** ou **Não**).
4. Clique em **Salvar**.

O campo **Assinado** indica se o termo já foi aceito pelo cliente. Use **Assinatura** para iniciar o fluxo de assinatura digital quando configurado em **Integrações → Assinatura Digital**.

---

### Financeiro

Gerencia os **títulos recorrentes** do contrato, gerados conforme o [Tipo de Cobrança](/doc/cadastros/tipo-cobranca) vinculado.

#### Gerar títulos

1. Abra o contrato salvo e vá à aba **Financeiro**.
2. Clique em **Gerar Financeiro**.

O sistema cria as parcelas com base no plano, descontos, dia de vencimento e tipo de cobrança do contrato. Clientes marcados como **Isento** não geram cobrança.

#### Listagem

| Botão | Função |
|-------|--------|
| **Gerar Financeiro** | Cria os títulos do contrato (conforme tipo de cobrança) |
| **Editar** | Altera o título selecionado |
| **Receber** | Registra pagamento do título |
| **Cancelar** | Cancela o título selecionado |
| **Estornar** | Estorna pagamento registrado |
| **Imprimir** | Imprime boletos ou documentos do título |
| **Enviar** | Envia a cobrança ao cliente |

**Busca:** ID, Número do Título, Status, Plano, Cliente, Valor, NF.

**Filtro:** **Mostrar cancelados**.

#### Editar um título

1. Selecione o título → **Editar**.
2. Altere **observações** sempre; **valor** e **vencimento** só se o título ainda não foi registrado no banco.
3. **Salvar**.

Detalhes completos em [Aba Financeiro — Editar um título](/doc/clientes/aba-financeiro#editar-um-titulo).

::: tip Visão consolidada
Para ver todos os títulos do cliente (de todos os contratos), use a [Aba Financeiro](/doc/clientes/aba-financeiro) no cadastro do cliente.
:::

---

### Financeiro Avulso

Lançamentos **pontuais** vinculados ao contrato — cobranças extras fora da geração recorrente (taxas, ajustes, serviços não recorrentes).

#### Listagem

| Botão | Função |
|-------|--------|
| **Novo** | Cria um título avulso |
| **Editar** | Altera o título selecionado |
| **Receber** | Registra pagamento |
| **Cancelar** | Cancela o título |
| **Estornar** | Estorna pagamento |
| **Imprimir** | Imprime boleto ou documento |
| **Enviar** | Envia cobrança ao cliente |

**Busca:** ID, Número do Título, Status, Cliente, Valor, NF.

**Filtro:** **Mostrar cancelados**.

#### Criar título avulso

1. Clique em **Novo**.
2. Preencha os campos:

| Campo | Obrigatório | Descrição |
|-------|:-----------:|-----------|
| **Plano** | Sim | Plano de referência (pré-preenchido com o plano do contrato) |
| **Valor** | Sim | Valor do título |
| **Vencimento** | Sim | Data de vencimento |
| **Descrição** | Não | Descrição do título |
| **Desconto (%)** / **Desconto (R$)** | Não | Descontos aplicados |
| **Acréscimo (%)** / **Acréscimo (R$)** | Não | Acréscimos aplicados |
| **Observações** | Não | Anotações sobre a parcela |

3. Clique em **Salvar**.

---

### Serviços Adicionais

Vincula **planos extras** ao contrato principal — serviços complementares cobrados junto com o plano base.

#### Listagem

| Botão | Função |
|-------|--------|
| **Novo** | Adiciona um serviço ao contrato |
| **Editar** | Altera o serviço selecionado |
| **Deletar** | Remove o serviço do contrato |

**Busca:** ID, Plano, Status, Observações.

#### Adicionar serviço

1. Clique em **Novo**.
2. Selecione o **Plano** adicional na listagem.
3. Informe **Desconto (%)** e **Desconto (R$)**, se houver.
4. Defina o **Status**: **Ativo**, **Inativo** ou **Suspenso**.
5. Preencha **Observações**, se necessário.
6. Clique em **Salvar**.

Os planos adicionais devem estar cadastrados previamente em [Planos](/doc/cadastros/planos).

---

### IXC Provedor

Vincula o contrato a uma **integração IXC** do cliente, permitindo sincronização de dados e ordens de serviço.

#### Listagem

| Botão | Função |
|-------|--------|
| **Novo** | Seleciona uma integração IXC para vincular ao contrato |
| **Editar** | Altera o vínculo selecionado |
| **Deletar** | Remove a integração do contrato |
| **Testar integração** | Valida a conexão com a API do IXC |

**Busca:** ID, Nome, URL da API.

#### Vincular integração

1. Clique em **Novo**.
2. Na listagem, selecione a integração IXC cadastrada (em **Integrações** no menu lateral).
3. Clique em **Selecionar**.

Com um vínculo ativo, ficam disponíveis:

- **Testar integração** — verifica se a API responde
- **Verificar permissões** — confere permissões e quantidade de dados retornados pela API (obrigatório antes de sincronizar)
- **Sincronizar dados OS** — sincroniza ordens de serviço com o IXC do cliente

::: warning Antes de sincronizar OS
Use **Verificar permissões** e confira se a coluna **Dados** e os registros amostrados correspondem ao que deseja importar. Se não, ajuste as permissões do usuário da API no **IXC Provedor** do cliente. Passo a passo em [IXC Provedor — Verificar permissões](/doc/integracoes/ixc-provedor#verificar-permissoes-antes-de-sincronizar-os).
:::

::: warning Pré-requisito
A integração IXC deve estar configurada previamente no módulo **Integrações** do ERP antes de vinculá-la ao contrato.
:::

---

## Listagem global de contratos

Em **Cadastros → Contratos**, a listagem segue o padrão de [listagens do ERP](/doc/geral/listagens).

### Busca — campos disponíveis

- ID
- Cliente (razão social do cliente)
- Plano
- Status
- Valor Final
- Endereço, Cidade, Estado

### Ações extras

- **Imprimir** — gera impressão do contrato selecionado (habilitado após selecionar um registro salvo)

---

## Editar ou excluir

1. Selecione o contrato na listagem (global ou na aba Contratos do cliente).
2. Clique em **Editar** ou **Deletar**.
3. Confirme quando solicitado.

::: warning
Alterações em contratos com títulos já emitidos podem exigir ajustes no financeiro. Alinhe com a equipe antes de modificar plano, banco ou tipo de cobrança em contratos ativos.
:::
---

::: info Precisa de ajuda?
**Suporte ISP Consultor:** [WhatsApp (84) 99866-7245](https://wa.me/5584998667245) · [Telegram @LucasMidia](https://t.me/LucasMidia)

Ao abrir um chamado, informe empresa, usuário, tela ou módulo, passos para reproduzir e capturas ou mensagem de erro.
:::
