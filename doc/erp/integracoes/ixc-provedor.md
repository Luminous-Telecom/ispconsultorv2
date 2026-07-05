# IXC Provedor

Cadastro **global** das integrações com o **IXC** (ERP de cada cliente). Cada integração armazena URL e token da API; o vínculo ao contrato do cliente é feito na [aba IXC Provedor](/doc/clientes/aba-contratos#ixc-provedor) do contrato.

## Como acessar

1. Faça login no painel administrativo.
2. No menu lateral, abra **Integrações**.
3. Clique em **IXC Provedor**.

---

## Listagem

A tela segue o padrão de [listagens do ERP](/doc/geral/listagens). Abaixo, apenas o que é **específico** desta tela.

### Barra de ações

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

## Cadastrar uma integração

1. Clique em **Novo**.
2. Preencha:

| Campo | Obrigatório | Descrição |
|-------|:-----------:|-----------|
| **Nome** | Sim | Identificação (ex.: *IXC Matriz*) |
| **Ativo** | Sim | Habilita ou desabilita a integração |
| **URL da API** | Sim | Endpoint do webservice — ex.: `https://seu-provedor.ixcsoft.com.br/webservice/v1` |
| **Token da API** | Sim | Credencial no formato `id:hash` gerada no IXC |

3. Clique em **Salvar**.
4. Use **Testar integração** e **Verificar permissões** para confirmar o acesso antes de vincular ao contrato e sincronizar OS.

---

## Editar uma integração

1. Selecione a integração na listagem.
2. Clique em **Editar**.
3. Altere **Nome**, **Ativo** ou **URL da API**.
4. No **Token da API**, deixe em branco para **manter o token atual** ou informe um novo no formato `id:hash`.
5. Clique em **Salvar**.

---

## Vincular ao contrato do cliente

Após cadastrar aqui, vincule a integração ao contrato:

1. Abra **Cadastros → Clientes** e edite o cliente.
2. Na aba **Contratos**, edite o contrato desejado.
3. Acesse a aba **IXC Provedor** e clique em **Novo** para selecionar a integração.

Fluxo completo em [Aba Contratos — IXC Provedor](/doc/clientes/aba-contratos#ixc-provedor).

---

## Verificar permissões antes de sincronizar OS

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
   - Acesse o **IXC Provedor** do cliente (painel administrativo dele).
   - Ajuste o **grupo de permissões** do usuário vinculado ao token da API — libere **Menu** e **Listar** nos cadastros necessários.
   - Confira a aba **Filiais** do usuário API (acesso às filiais corretas).
   - Confira o **setor do operador** vinculado ao usuário, quando aplicável (Setores, Colaboradores e Assuntos dependem disso).
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
