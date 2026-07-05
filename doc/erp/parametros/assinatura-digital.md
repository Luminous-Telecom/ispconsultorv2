# Assinatura Digital

Configuração da **assinatura digital** de contratos e termos — integração com provedores externos (Assinafy ou ZapSign).

::: info Pré-requisitos
Modelos de documento devem estar cadastrados em [Documentos do Sistema](/doc/parametros/documentos-do-sistema). O fluxo de assinatura é acionado na [aba Termos](/doc/clientes/aba-contratos#termos) do contrato.
:::

## Como acessar

1. Faça login no painel administrativo.
2. No menu lateral, abra **Parâmetros**.
3. Clique em **Assinatura Digital**.

---

## Campos de configuração

| Campo | Descrição |
|-------|-----------|
| **Habilitar Assinatura Digital** | Ativa ou desativa o recurso no ERP |
| **Provedor de API** | **Assinafy** (100 assinaturas/mês grátis) ou **ZapSign** (5 assinaturas/mês grátis) |
| **Dias de Expiração Padrão** | Prazo padrão para o signatário concluir a assinatura |
| **API Key** | Chave de API do serviço escolhido |
| **Workspace Account ID** | Identificador da conta/workspace no cliente |

Clique em **Salvar** após configurar.

---

## Monitoramento

Eventos de assinatura ficam registrados em [Logs de Assinatura Digital](/doc/logs/logs#logs-de-assinatura-digital).

---

::: info Precisa de ajuda?
Consulte [Suporte e Chamados](/doc/configuracoes/suporte) para abrir um chamado com a equipe ISP Consultor.
:::
