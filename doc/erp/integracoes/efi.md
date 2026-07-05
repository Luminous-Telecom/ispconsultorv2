# Efí (EFI) — API e Webhook

Guia completo para integrar a **Efí** (Gerencianet) com o ISP Consultor: criar a **aplicação API**, obter credenciais e **Identificador da Conta**, e configurar o **banco** no ERP.

::: info Documentação relacionada
Cadastro de bancos no ERP: [Bancos](/doc/cadastros/bancos). Contratos que usam o banco: [Contratos](/doc/clientes/aba-contratos).
:::

## Visão geral

| Direção | O que faz |
|---------|-----------|
| **ERP → Efí (API)** | Emite boletos/PIX, consulta e cancela cobranças |
| **Efí → ERP (Webhook)** | Notifica alterações de status das cobranças |

---

## Pré-requisitos

1. **Conta Efí Empresas** — acesse o painel em [sejaefi.com.br](https://sejaefi.com.br).

---

## Parte A — Painel Efí

### 1. Acessar a área de API

1. Faça login no painel **Efí Empresas**.
2. No menu lateral, clique em **API**.

![Menu API — Efí Empresas](/integracoes/efi/01-menu-api.png)

---

### 2. Criar aplicação {#criar-aplicacao}

1. Na tela **Introdução**, clique em **Criar aplicação**.

![Introdução — área do integrador](/integracoes/efi/02-introducao-api.png)

2. Informe o **Nome da aplicação** (ex.: *ispconsultor*) e clique em **Continuar**.

![Nome da aplicação](/integracoes/efi/03-nome-aplicacao.png)

3. Selecione as APIs e escopos necessários:

| API | Escopos |
|-----|---------|
| **API Cobranças** | Emissão de cobranças |
| **API Pix** | Alterar cobranças, Consultar cobranças, Alterar Pix, Consultar Pix, Enviar Pix |

Marque os escopos em **Produção** e, se for testar antes, também em **Homologação**.

![Escopos das APIs](/integracoes/efi/04-escopos-api.png)

4. Conclua a etapa **Assinatura eletrônica** informando sua senha de transação.

![Assinatura eletrônica](/integracoes/efi/05-assinatura-eletronica.png)

5. Após a confirmação, copie o **Client ID** e o **Client Secret** exibidos. {#credenciais}

![Credenciais da aplicação](/integracoes/efi/06-credenciais-criadas.png)

::: warning Segurança
Guarde as credenciais em local seguro. Use as de **Produção** no ERP com **Sandbox = Não** e as de **Homologação** com **Sandbox = Sim**.
:::

---

### 3. Obter o Identificador da Conta {#identificador-conta}

1. Na tela **Introdução** da API, clique em **Identificador de conta** (canto superior direito).

![Identificador de conta — menu](/integracoes/efi/07-identificador-conta-menu.png)

2. Copie o valor **`payee_code`** exibido no modal.

![Identificador de conta — payee_code](/integracoes/efi/08-identificador-conta.png)

Esse código corresponde ao campo **Identificador da Conta** no ERP.

---

## Parte B — ERP ISP Consultor {#parte-b}

### 1. Cadastrar o banco EFI

1. Faça login no painel administrativo.
2. Abra **Cadastros → Bancos**.
3. Clique em **Novo** (ou edite um banco existente).

#### Aba Informações Básicas

| Campo | Valor sugerido |
|-------|----------------|
| **Nome do Banco** | Ex.: *Efí Produção* |
| **Tipo de Banco** | **EFI (Código: 364)** |
| **Ativo** | **Sim** |
| **Descrição** | Opcional — ex.: *Cobranças Efí* |

#### Aba Configurações da API

| Campo | Valor |
|-------|--------|
| **Client ID Produção** | Client ID copiado no passo [5](#credenciais) — use credencial de **Homologação** se **Sandbox = Sim** |
| **Client Secret Produção** | Client Secret copiado no passo [5](#credenciais) |
| **Identificador da Conta** | Valor `payee_code` do passo [3](#identificador-conta) |
| **URL de Retorno (Webhook)** | Gerada automaticamente pelo ERP — **não é necessário** copiar nem cadastrar na Efí; ao emitir boletos, a URL já é enviada na requisição |
| **Sandbox** | **Não** (produção) ou **Sim** (homologação) |
| **Local de Pagamento** | Texto do boleto (opcional) |
| **Percentual de Multa (%)** | Padrão 2,00 |
| **Percentual de Juros (% ao dia)** | Padrão 0,03 |

4. Clique em **Salvar**.

---

### 2. Vincular o banco ao contrato

1. Abra **Clientes** → selecione o cliente → aba **Contratos**.
2. No contrato, escolha o banco **Efí** cadastrado.
3. Gere um título e confirme se o boleto/PIX é criado na Efí.

Detalhes em [Contratos](/doc/clientes/aba-contratos).

---

## Teste ponta a ponta

1. Banco Efí salvo com credenciais e **Identificador da Conta** corretos.
2. **Sandbox** coerente com o ambiente das credenciais (Homologação × Sim · Produção × Não).
3. Contrato com banco Efí → gere um título.
4. Efetue ou simule o pagamento e verifique se o status do título atualiza no ERP.

---

## Solução de problemas

| Sintoma | Causa provável | Ação |
|---------|----------------|------|
| Erro **401** ao gerar boleto | Client ID/Secret incorretos ou ambiente trocado | Conferir **Sandbox** e credenciais (Produção vs Homologação) |
| Boleto não gera | Escopos da API incompletos | Marcar **API Cobranças** e escopos **Pix** conforme passo [2](#criar-aplicacao) |
| Webhook não atualiza título | Callback não recebido pelo ERP | Conferir credenciais, **Sandbox** e se o título foi gerado após salvar o banco; a URL de retorno é enviada automaticamente na emissão do boleto |
| Campo obrigatório no ERP | Identificador ausente | Copiar `payee_code` em **Identificador da Conta** |

---

## Referências externas

- [Efí — portal](https://sejaefi.com.br)
- [Documentação API Efí](https://dev.efipay.com.br/)

---

::: info Precisa de ajuda?
**Suporte ISP Consultor:** [WhatsApp (84) 99866-7245](https://wa.me/5584998667245) · [Telegram @LucasMidia](https://t.me/LucasMidia)

Ao abrir um chamado, informe empresa, ID do banco, ambiente (Sandbox/Produção) e capturas da tela, se possível (sem expor Client Secret).
:::
