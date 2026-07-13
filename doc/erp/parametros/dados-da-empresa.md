# Dados da Empresa

Cadastro da **empresa da consultoria** no ERP — razão social, endereço, contatos e responsável legal. Esses dados aparecem em documentos, NFS-e e comunicações enviadas pelo sistema.

::: info Acesso restrito
Normalmente apenas administradores alteram esta tela. Consultores consultam os dados quando necessário para conferência em contratos ou notas fiscais.
:::

## Como acessar

1. Faça login no painel administrativo.
2. No menu lateral, abra **Parâmetros**.
3. Clique em **Dados da Empresa**.

---

## Abas

### Empresa {#empresa}

| Campo | Obrigatório | Descrição |
|-------|:-----------:|-----------|
| **ID da Empresa** | Não editável | Identificador da empresa no sistema. Use este número para confirmar que integrações estão apontando para a empresa correta |
| **Razão Social** | Sim | Nome jurídico da consultoria |
| **Nome Fantasia** | Não | Nome comercial |
| **CNPJ** | Sim | CNPJ da empresa |
| **Inscrição Estadual** | Não | IE, quando aplicável |
| **Inscrição Municipal** | Não | IM, quando aplicável |
| **Logo da Empresa** | Não | Imagem usada em documentos e relatórios |

### Endereço {#endereco}

| Campo | Obrigatório | Descrição |
|-------|:-----------:|-----------|
| **CEP** | Sim | CEP da sede |
| **Endereço** | Sim | Logradouro |
| **Número** | Sim | Número |
| **Complemento** | Não | Apto, sala etc. |
| **Bairro** | Sim | Bairro |
| **Cidade** | Sim | Cidade |
| **UF** | Sim | Sigla do estado |

### Contato {#contato}

| Campo | Obrigatório | Descrição |
|-------|:-----------:|-----------|
| **Telefone** | Não | Telefone fixo |
| **Celular** | Não | Celular de contato |
| **E-mail** | Sim | E-mail principal da empresa |
| **Site** | Não | Site institucional |

### Responsável {#responsavel}

| Campo | Descrição |
|-------|-----------|
| **Nome** | Nome do responsável legal |
| **CPF** | CPF do responsável |
| **Cargo** | Cargo ou função |

### Faturas abertas / Faturas pagas {#faturas}

Abas das **faturas do plano SaaS** da consultoria junto à ISP Consultor (assinatura do próprio ERP).

| Aba | Conteúdo |
|-----|----------|
| **Faturas abertas** | Títulos pendentes ou vencidos — consulte, imprima boleto/documento (**Imprimir**) e efetue o pagamento pela plataforma |
| **Faturas pagas** | Histórico de títulos já quitados |

---

## Salvar alterações

Após editar qualquer aba, clique em **Salvar**. Use **Cancelar** para descartar mudanças não salvas.

## ID da empresa

O **ID da Empresa** aparece no primeiro campo da aba **Empresa** em **Parâmetros → Dados da Empresa**. O campo é somente leitura.

Use esse número para conferir integrações ou chamadas à [API pública](/doc/integracoes/api). Os endpoints de dados da empresa estão documentados na seção **Dados da Empresa** da referência de API.

---

::: info Precisa de ajuda?
**Suporte ISP Consultor:** [WhatsApp (84) 99866-7245](https://wa.me/5584998667245) · [Telegram @LucasMidia](https://t.me/LucasMidia)

Ao abrir um chamado, informe empresa, usuário, tela ou módulo, passos para reproduzir e capturas ou mensagem de erro.
:::
