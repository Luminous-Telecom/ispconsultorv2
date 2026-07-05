# Notas Fiscais

Consulta e gestão das **NFS-e emitidas** pela consultoria, vinculadas aos títulos de recebimento dos clientes.

## Como acessar

1. Faça login no painel administrativo.
2. No menu lateral, abra **Financeiro**.
3. Clique em **Notas Fiscais**.

::: tip Configuração
A emissão de NFS-e depende da integração configurada em **Parâmetros → NFS-e**. A emissão por título também está disponível em **Contas A Receber** e na [Aba Financeiro](/doc/clientes/aba-financeiro) do cliente.
:::

---

## Listagem

A tela segue o padrão de [listagens do ERP](/doc/geral/listagens). Abaixo, apenas o que é **específico** desta tela.

### Barra de ações

| Botão | Função |
|-------|--------|
| **Imprimir** | Imprime a nota fiscal selecionada |
| **Cancelar Nota** | Cancela a NFS-e selecionada na prefeitura/integração |

::: tip Seleção de registro
As ações ficam desabilitadas até que uma nota seja selecionada na tabela.
:::

### Busca — campos disponíveis

- ID
- Número
- Chave de Acesso
- Protocolo
- Valor
- Status
- NFS-e Status
- ID Contrato (título de origem)
- Cliente

---

## Emitir NFS-e a partir de um título

1. Em **Contas A Receber** ou na [Aba Financeiro](/doc/clientes/aba-financeiro) do cliente, selecione o título.
2. Abra **NFS-e → Gerar NFS-e Avulsa**.
3. Revise cliente, valores, descrição do serviço e alíquota ISS (pré-preenchidos conforme [Parâmetros → NFS-e](/doc/parametros/nfse)).
4. Confirme a emissão.

A nota emitida aparece nesta listagem e no campo **NF** do título de origem.

---

## Relação com títulos

Cada nota fiscal está vinculada a um título de recebimento (campo **ID Contrato** na busca). Para emitir NFS-e a partir de um título em aberto, use o botão **NFS-e** em **Contas A Receber** ou na aba Financeiro do cliente.

---

::: warning Cancelamento
Cancelar uma nota fiscal é irreversível na integração com a prefeitura. Confirme os dados antes de usar **Cancelar Nota**.
:::

---

::: info Precisa de ajuda?
Consulte [Suporte e Chamados](/doc/configuracoes/suporte) para abrir um chamado com a equipe ISP Consultor.
:::
