# RPKI

Visão **global** da gestão de **RPKI** (Resource Public Key Infrastructure) na consultoria — CAs, provisioning, repositórios, ROAs e ASPAs de todos os clientes. Para operar RPKI de um cliente específico, use as [Abas RPKI](/doc/clientes/aba-rpki) no cadastro do cliente.

## Como acessar

No menu lateral, abra **RPKI** e escolha o subitem desejado:

| Submenu | Função |
|---------|--------|
| **CAs** | Certificate Authorities filhas |
| **CAs-pai** | Provisioning com a CA superior |
| **Repositórios** | Publicação de objetos RPKI |
| **ROAs** | Route Origin Authorizations |
| **ASPAs** | AS Provider Authorizations |
| **Validar Rota** | Ferramenta de validação de prefixo/ASN |

::: tip Ordem sugerida
1. Cadastre a **CA** do cliente.
2. Configure a **CA-pai**.
3. Publique no **Repositório**.
4. Crie **ROAs** e **ASPAs** conforme necessário.

Detalhes de cada etapa estão em [Abas RPKI](/doc/clientes/aba-rpki).
:::

---

## CAs, CAs-pai, Repositórios, ROAs e ASPAs

Essas telas listam registros de **todos os clientes**. O comportamento, campos de busca, formulários e ações são os mesmos descritos por aba em [Abas RPKI](/doc/clientes/aba-rpki).

### Diferença global vs. aba do cliente

| Tela | Escopo |
|------|--------|
| **RPKI → CAs** (e demais subitens) | Todos os clientes |
| **Clientes → abas CAs, CAs-pai, etc.** | Um cliente específico |

Na visão global, a coluna **Cliente** ajuda a identificar a qual cliente pertence cada registro. Na aba do cliente, a listagem já vem filtrada.

::: warning Cuidado ao navegar
Clicar em **CAs** (ou outro item RPKI) **fora** do modal do cliente abre a tela global de RPKI, não a aba filtrada do cliente em edição.
:::

---

## Validar Rota

Ferramenta exclusiva do menu global **RPKI → Validar Rota** — não existe como aba no cadastro do cliente (a validação por ROA individual está na aba ROAs; veja [Abas RPKI](/doc/clientes/aba-rpki#aba-roas)).

### Como usar

1. Abra **RPKI → Validar Rota**.
2. Informe o **Prefixo (CIDR)** — ex.: `203.0.113.0/24` ou `2001:db8::/32`.
3. Opcionalmente, informe o **ASN de origem**.
4. Clique em **Validar**.

O ERP consulta as ROAs publicadas e exibe se a rota é **válida**, **inválida** ou **desconhecida** (not found) perante o RPKI.

---

## Boas práticas

- Confirme prefixos e ASNs com o cliente antes de publicar ROAs.
- Use **Sincronizar** e **Atualizar** após alterações externas na CA-pai ou no repositório.
- Documente handles e respostas XML trocadas na [Aba Arquivos](/doc/clientes/aba-arquivos) do cliente.
---

::: info Precisa de ajuda?
**Suporte ISP Consultor:** [WhatsApp (84) 99866-7245](https://wa.me/5584998667245) · [Telegram @LucasMidia](https://t.me/LucasMidia)

Ao abrir um chamado, informe empresa, usuário, tela ou módulo, passos para reproduzir e capturas ou mensagem de erro.
:::
