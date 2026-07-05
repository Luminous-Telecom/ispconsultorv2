# Typebot

Integração do **Typebot** com o ISP Consultor usando as rotas **existentes** da API REST. O chatbot consulta clientes, contratos e títulos — ou cadastra novos clientes — via blocos **HTTP Request** no fluxo do Typebot.

::: tip Bloco no Typebot
No Typebot não existe bloco **Webhook** separado — todas as chamadas externas ao ERP são feitas pelo bloco **HTTP Request**.
:::

## Pré-requisito: token de API

Todas as rotas exigem autenticação `Authorization: Bearer <token>`.

1. Faça login no painel administrativo.
2. Abra **Parâmetros → Usuários**.
3. Edite o usuário que representará a integração (ou crie um dedicado ao bot).
4. Clique em **Gerar token** e copie o **Webhook secret** exibido — esse valor é o token Bearer.

Detalhes do cadastro de usuários em [Usuários](/doc/parametros/usuarios).

::: warning Segurança
Trate o token como senha. Não publique em fluxos públicos, repositórios ou prints. Regenerar o token invalida o anterior — atualize todos os blocos HTTP Request no Typebot.
:::

## URL base da API

```
https://ispconsultor.com.br/api/...
```

Exemplo: `https://ispconsultor.com.br/api/clientes/cnpj/37143069000184`

---

## 1. Consultar cliente por CNPJ (recomendado)

**Uma única URL** retorna cadastro, contratos, títulos e planos do cliente.

### Requisição

| Item | Valor |
|------|--------|
| **Método** | `GET` |
| **URL** | `https://ispconsultor.com.br/api/clientes/cnpj/{cnpj}` |
| **Headers** | `Authorization: Bearer SEU_TOKEN` |

Exemplo: `https://ispconsultor.com.br/api/clientes/cnpj/37143069000184`

### Configuração no Typebot

1. Adicione um bloco **HTTP Request**.
2. **URL:** `https://ispconsultor.com.br/api/clientes/cnpj/{{Cnpj}}`
3. **Método:** `GET`
4. **Headers:** `Authorization: Bearer SEU_TOKEN`

### CNPJ na URL

Use apenas os **14 dígitos** (sem pontuação). Se o visitante digitar `37.143.069/0001-84`, remova a formatação antes da chamada — por exemplo: `{{Cnpj}}.replace(/\D/g, '')`.

### Resposta (200)

O corpo segue `{ success, message, data }`. Em `data` vêm os campos do cliente **e** os relacionamentos aninhados:

| Campo em `data` | Conteúdo |
|-----------------|----------|
| Campos do cliente | `id`, `cnpj`, `razao_social`, `email`, endereço, etc. |
| `contratos` | Contratos vinculados |
| `titulos` | Títulos/faturas |
| `planos` | Planos relacionados |

Para consultas parciais, use também [Contratos do cliente](#2-consultar-contratos-do-cliente) e [Títulos do cliente](#3-consultar-títulos-do-cliente).

### Erros comuns

| Código | Significado |
|--------|-------------|
| **404** | CNPJ não encontrado na base |
| **401** | Token inválido ou ausente |

---

## 2. Consultar contratos do cliente

Use quando já tiver o `id` do cliente (por exemplo, retornado na etapa anterior).

| Item | Valor |
|------|--------|
| **Método** | `GET` |
| **URL** | `https://ispconsultor.com.br/api/contratos/cliente/{clienteId}` |
| **Headers** | `Authorization: Bearer SEU_TOKEN` |

---

## 3. Consultar títulos do cliente

Lista títulos/faturas de um cliente específico.

| Item | Valor |
|------|--------|
| **Método** | `GET` |
| **URL** | `https://ispconsultor.com.br/api/titulos?cliente_id={clienteId}` |
| **Headers** | `Authorization: Bearer SEU_TOKEN` |

Exemplo: `https://ispconsultor.com.br/api/titulos?cliente_id=123`

---

## 4. Criar cliente

Quando o bot coleta dados do visitante e deve registrar o cliente no ERP.

### Requisição

| Item | Valor |
|------|--------|
| **Método** | `POST` |
| **URL** | `https://ispconsultor.com.br/api/clientes` |
| **Headers** | `Authorization: Bearer SEU_TOKEN` |
| **Body** | JSON com os campos abaixo |

### Configuração no Typebot

1. Bloco **HTTP Request**.
2. **URL:** `https://ispconsultor.com.br/api/clientes`
3. **Método:** `POST`
4. **Headers:** `Authorization: Bearer SEU_TOKEN`
5. **Body (JSON):** mapeie as variáveis do fluxo para os campos do ERP.

### Campos obrigatórios no body

| Campo ERP | Exemplo no body |
|-----------|-----------------|
| `cnpj` | `"{{Cnpj}}"` |
| `razao_social` | `"{{RazaoSocial}}"` |
| `nome_fantasia` | `"{{NomeFantasia}}"` |
| `email` | `"{{Email}}"` |
| `telefone` | `"{{Telefone}}"` |
| `whatsapp` | `"{{Whatsapp}}"` |
| `cep` | `"{{Cep}}"` |
| `endereco` | `"{{Endereco}}"` |
| `numero` | `"{{Numero}}"` |
| `complemento` | `"{{Complemento}}"` |
| `bairro` | `"{{Bairro}}"` |
| `cidade` | `"{{Cidade}}"` |
| `estado` | `"{{Estado}}"` |
| `valor_primeiro_titulo` | `"total"` ou `"proporcional"` |

Após criar o cliente, use [Cadastro de clientes](/doc/clientes/cadastro-cliente) no ERP para contratos, financeiro e demais abas.

---

## Resumo das rotas

| Uso | Método | Rota | Auth |
|-----|--------|------|------|
| Cliente por CNPJ | `GET` | `https://ispconsultor.com.br/api/clientes/cnpj/{cnpj}` | `Authorization: Bearer <token>` |
| Contratos do cliente | `GET` | `https://ispconsultor.com.br/api/contratos/cliente/{clienteId}` | `Authorization: Bearer <token>` |
| Títulos do cliente | `GET` | `https://ispconsultor.com.br/api/titulos?cliente_id={clienteId}` | `Authorization: Bearer <token>` |
| Criar cliente | `POST` | `https://ispconsultor.com.br/api/clientes` | `Authorization: Bearer <token>` |

---

::: info Precisa de ajuda?
Consulte [Suporte e Chamados](/doc/configuracoes/suporte) para abrir um chamado com a equipe ISP Consultor.
:::
