# Clientes

Guia para consultores cadastrarem e gerenciarem **clientes** no ERP ISP Consultor.

## Como acessar

1. Faça login no painel administrativo.
2. No menu lateral, abra **Cadastros**.
3. Clique em **Clientes**.

A tela exibe a listagem de todos os clientes cadastrados na empresa ativa.

## Listagem

A tela segue o padrão de [listagens do ERP](/doc/geral/listagens). Abaixo, apenas o que é **específico** do módulo Clientes.

### Busca — campos disponíveis

Além de **Todos** e **ID**, é possível filtrar por:

- CNPJ
- Razão Social
- Nome Fantasia
- Email
- Telefone (WhatsApp)
- Endereço, Número, Complemento, Bairro, Cidade

### Colunas da tabela

- **ID** — identificador interno
- **CNPJ**
- **Razão Social**
- **Nome Fantasia**
- **Email**
- **Telefone**
- **Endereço**

---

## Cadastrar um novo cliente

1. Na listagem, clique em **Novo**.
2. Preencha as abas do formulário (detalhes abaixo).
3. Clique em **Salvar**.

Para descartar, use **Cancelar** ou o **X** no canto superior.

### Abas disponíveis no cadastro

No cadastro de um cliente **novo**, estas abas ficam disponíveis:

| Aba | Conteúdo |
|-----|----------|
| Dados Básicos | CNPJ, razão social, nome fantasia e status |
| Contato | Email, telefone, WhatsApp, comunicação e central do assinante |
| Endereço | CEP e endereço completo |
| Observações | Texto livre sobre o cliente |

As abas **Contratos**, **Financeiro**, **Arquivos**, **CAs**, **CAs-pai**, **Repositórios** e demais módulos (RPKI, equipamentos) ficam disponíveis **após salvar** o registro, pois dependem do cliente já existir no sistema.

---

## Aba Dados Básicos

| Campo | Obrigatório | Descrição |
|-------|:-----------:|-----------|
| **CNPJ** | Sim | CNPJ do cliente. Formato: `00.000.000/0000-00` |
| **Razão Social** | Sim | Nome jurídico do cliente |
| **Nome Fantasia** | Não | Nome comercial utilizado no dia a dia |
| **Status** | Sim | **Sim** = cliente ativo · **Não** = cliente inativo |

::: info
Clientes inativos permanecem no sistema, mas não devem receber novos vínculos comerciais sem reativação prévia.
:::

---

## Aba Contato

| Campo | Obrigatório | Descrição |
|-------|:-----------:|-----------|
| **Email** | Sim | E-mail principal de contato do cliente |
| **Telefone** | Não | Telefone fixo ou alternativo |
| **WhatsApp** | Sim | WhatsApp para contato com o cliente |
| **Comunicação** | — | Canais habilitados para envio de mensagens: **Email** e/ou **WhatsApp** |

### Central do Assinante

Seção para acesso do cliente ao portal:

- **Senha** — defina a senha de acesso. No cadastro novo, informe a senha inicial. Na edição, deixe em branco para **não alterar** a senha atual.
- **Abrir Central do Assinante** — abre o portal em nova aba (disponível após o cliente estar salvo).

O identificador de login (CNPJ ou E-mail) é configurado em **Parâmetros → [Recursos do Sistema](/doc/parametros/recursos-do-sistema)** — parâmetro **Método de Login**.

---

## Aba Endereço

| Campo | Obrigatório | Descrição |
|-------|:-----------:|-----------|
| **CEP** | Sim | CEP no formato `00000-000`. Pode preencher automaticamente os demais campos |
| **Endereço** | Sim | Logradouro (rua, avenida, etc.) |
| **Número** | Sim | Número do imóvel |
| **Complemento** | Não | Apartamento, sala, bloco, etc. |
| **Bairro** | Sim | Bairro |
| **Cidade** | Sim | Município |
| **UF** | Sim | Sigla do estado (ex.: `SP`, `RN`) |

---

## Aba Observações

Campo de texto livre para anotações internas sobre o cliente — acordos comerciais, particularidades de atendimento, pendências, etc.

::: tip
Use observações para registrar contexto que ajude outros consultores no atendimento ao cliente.
:::

---

## Editar um cliente existente

1. Na listagem, selecione o registro.
2. Clique em **Editar** (ou dê duplo clique na linha).
3. Altere os dados nas abas necessárias.
4. Clique em **Salvar**.

Após salvar, as abas **Contratos**, **Financeiro** e demais ficam acessíveis ao editar o cliente em **Cadastros → Clientes**.

Antes de criar um contrato, configure [Planos](/doc/cadastros/planos), [Dias de Vencimento](/doc/parametros/dias-vencimento), [Bancos](/doc/cadastros/bancos), [Tipo de Cobrança](/doc/cadastros/tipo-cobranca) e [Documentos do Sistema](/doc/parametros/documentos-do-sistema) — veja a [ordem sugerida](/doc/clientes/aba-contratos#ordem-sugerida).

Consulte também:

- [Aba Contratos](/doc/clientes/aba-contratos)
- [Aba Financeiro](/doc/clientes/aba-financeiro)
- [Aba Arquivos](/doc/clientes/aba-arquivos)
- [Abas RPKI](/doc/clientes/aba-rpki) — CAs, CAs-pai, Repositórios, ROAs e ASPAs
- [Abas Equipamentos](/doc/clientes/aba-equipamentos-provedor) — Equipamentos, Túneis (agentes) e Backups SSH

---

## Excluir um cliente

1. Selecione o registro na listagem.
2. Clique em **Deletar**.
3. Confirme a operação quando solicitado.

::: warning
A exclusão pode impactar contratos, financeiro e integrações vinculadas. Alinhe com o cliente e a equipe antes de remover registros com histórico ativo.
:::

---

## Boas práticas para consultores

- Valide CNPJ e razão social com o contrato social ou documento do cliente antes de salvar.
- Mantenha email e WhatsApp atualizados — são usados na comunicação automática com o cliente.
- Preencha o endereço completo; alguns relatórios e integrações dependem desses dados.
- Prefira **inativar** (Status = Não) em vez de excluir quando o atendimento ao cliente for pausado temporariamente.
- Registre acordos e particularidades na aba **Observações** para facilitar a continuidade do atendimento.
---

::: info Precisa de ajuda?
**Suporte ISP Consultor:** [WhatsApp (84) 99866-7245](https://wa.me/5584998667245) · [Telegram @LucasMidia](https://t.me/LucasMidia)

Ao abrir um chamado, informe empresa, usuário, tela ou módulo, passos para reproduzir e capturas ou mensagem de erro.
:::
