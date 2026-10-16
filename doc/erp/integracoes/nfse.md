# NFS-e

Integração para emissão de **Nota Fiscal de Serviço eletrônica (NFS-e)** integrada ao ERP — usada nas ações de NFS-e em [Contas A Receber](/doc/financeiro/contas-a-receber) e na [Aba Financeiro](/doc/clientes/aba-financeiro) do cliente.

::: info Pré-requisitos
Configure também [Dados da Empresa](/doc/parametros/dados-da-empresa) com CNPJ e endereço corretos antes de emitir notas.
:::

## Como acessar

1. Faça login no painel administrativo.
2. No menu lateral, abra **Integrações**.
3. Clique em **NFS-e**.

---

## Campos de configuração

| Campo | Descrição |
|-------|-----------|
| **Provedor de NFS-e** | **Asaas** ou **Portal Nacional** (certificado A1) |
| **Código de Serviço Municipal** | No Portal Nacional, código nacional de 6 dígitos (ex.: `140101`). Com 4 dígitos, o sistema completa com `01`. No Asaas, código municipal |
| **Alíquota de ISS (%)** | Percentual de ISS aplicável |
| **Descrição do Serviço** | Texto padrão que aparece na nota |
| **Série da NF** | No Portal Nacional, de 1 a 5 dígitos. No Asaas, série `80000` a `89999` |
| **Número do DPS** | Numeração do Documento de Prestação de Serviços. Sobe automaticamente a cada nota autorizada no Portal Nacional |

Com o provedor **Portal Nacional**, informe também:

| Campo | Descrição |
|-------|-----------|
| **Certificado A1** | Arquivo `.pfx` do e-CNPJ da empresa |
| **Senha do certificado** | Senha do arquivo `.pfx` |
| **Ambiente** | **Homologação** emite nota sem valor fiscal. **Produção** emite nota válida |
| **Simples Nacional** | Não optante, MEI ou ME/EPP |
| **Regime de apuração do SN** | Obrigatório para ME/EPP |
| **Regime especial de tributação** | Use **Nenhum** quando não houver regime especial |
| **Retenção do ISS** | Não retido, retido pelo tomador ou pelo intermediário |

O certificado A1 não é gratuito: a homologação usa o mesmo certificado da produção. A diferença é que a nota de homologação não vale na prefeitura.

Antes de emitir, confira [Dados da Empresa](/doc/parametros/dados-da-empresa) (CNPJ, inscrição municipal e CEP) e o endereço completo do cliente, com CEP. O município precisa estar aderente ao Sistema Nacional de NFS-e.

---

## Testar configuração

Após preencher os dados, clique em **Testar Conexão**. No Portal Nacional, o teste confirma que o certificado A1 abre a Sefin. Em seguida, clique em **Salvar**.

A emissão continua em **Contas a Receber** ou na aba Financeiro do cliente: **NFS-e → Gerar NFS-e Avulsa**. A nota autorizada aparece em [Notas Fiscais](/doc/financeiro/notas-fiscais).

---

## Emissão no dia a dia

Consultores emitem NFS-e a partir dos títulos financeiros — veja [Contas A Receber](/doc/financeiro/contas-a-receber) e [Notas Fiscais](/doc/financeiro/notas-fiscais).
---

::: info Precisa de ajuda?
**Suporte ISP Consultor:** [WhatsApp (84) 99866-7245](https://wa.me/5584998667245) · [Telegram @LucasMidia](https://t.me/LucasMidia)

Ao abrir um chamado, informe empresa, usuário, tela ou módulo, passos para reproduzir e capturas ou mensagem de erro.
:::
