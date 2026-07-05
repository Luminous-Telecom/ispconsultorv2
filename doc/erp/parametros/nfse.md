# NFS-e

Parâmetros para emissão de **Nota Fiscal de Serviço eletrônica (NFS-e)** integrada ao ERP — usada nas ações de NFS-e em [Contas A Receber](/doc/financeiro/contas-a-receber) e na [Aba Financeiro](/doc/clientes/aba-financeiro) do cliente.

::: info Pré-requisitos
Configure também [Dados da Empresa](/doc/parametros/dados-da-empresa) com CNPJ e endereço corretos antes de emitir notas.
:::

## Como acessar

1. Faça login no painel administrativo.
2. No menu lateral, abra **Parâmetros**.
3. Clique em **NFS-e**.

---

## Campos de configuração

| Campo | Descrição |
|-------|-----------|
| **Provedor de NFS-e** | **Asaas** (disponível) ou **Portal Nacional** (em breve) |
| **Código de Serviço Municipal** | Código LC 116 do serviço prestado |
| **Alíquota de ISS (%)** | Percentual de ISS aplicável |
| **Descrição do Serviço** | Texto padrão que aparece na nota |
| **Série da NF** | Série utilizada na emissão |
| **Número do DPS** | Numeração do Documento de Prestação de Serviços |

Credenciais de API do cliente (token/chave) são informadas nos campos adicionais exibidos conforme o **Provedor de NFS-e** selecionado.

---

## Testar configuração

Após preencher os dados, clique em **Testar Conexão** para validar a comunicação com o provedor de NFS-e. Em seguida, clique em **Salvar**.

---

## Emissão no dia a dia

Consultores emitem NFS-e a partir dos títulos financeiros — veja [Contas A Receber](/doc/financeiro/contas-a-receber) e [Notas Fiscais](/doc/financeiro/notas-fiscais).

---

::: info Precisa de ajuda?
Consulte [Suporte e Chamados](/doc/configuracoes/suporte) para abrir um chamado com a equipe ISP Consultor.
:::
