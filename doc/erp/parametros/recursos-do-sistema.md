# Recursos do Sistema

Parâmetros **globais de comportamento** do ERP — validações automáticas, regras de vencimento e configurações da Central do Assinante.

::: info Acesso restrito
Alterações nesta tela impactam todo o sistema. Normalmente restrita a administradores.
:::

## Como acessar

1. Faça login no painel administrativo.
2. No menu lateral, abra **Parâmetros**.
3. Clique em **Recursos do Sistema**.

---

## Opções disponíveis

| Parâmetro | Descrição |
|-----------|-----------|
| **Validar CNPJ** | Quando ativo, valida o dígito verificador ao cadastrar CNPJs |
| **Validar CEP** | Quando ativo, consulta e preenche endereço a partir do CEP informado |
| **Títulos que Vencem aos Sábados** | Permite ou impede vencimento de boletos em sábados |
| **Títulos que Vencem aos Domingos** | Permite ou impede vencimento de boletos em domingos |
| **Método de Login** | Define se o login na [Central do Assinante](/doc/clientes/cadastro-cliente#central-do-assinante) usa **CNPJ** ou **E-mail** como identificador |

Após ajustar, clique em **Salvar**.

---

## Impacto nos módulos

- **Validar CNPJ/CEP** — afeta cadastros de [Clientes](/doc/clientes/cadastro-cliente) e [Fornecedores](/doc/cadastros/fornecedores).
- **Vencimento sábado/domingo** — afeta geração de títulos em [Contratos](/doc/clientes/aba-contratos) combinado com [Dias de Vencimento](/doc/parametros/dias-vencimento).
- **Método de Login** — afeta apenas o portal **Central do Assinante** (login do cliente final), não o acesso dos usuários do ERP em [Usuários](/doc/parametros/usuarios).

---

::: info Precisa de ajuda?
Consulte [Suporte e Chamados](/doc/configuracoes/suporte) para abrir um chamado com a equipe ISP Consultor.
:::
