# Plano: reduzir exposição das APIs públicas e hotsite sem fetch em runtime

Documento de **possível evolução** — não implementado. Serve como referência para endurecer rotas abertas e fazer o site institucional (home/planos) funcionar **sem** o browser chamar `/api/public/*`.

---

## Contexto

Hoje o frontend é uma **SPA React** servida como estático (Nginx). O browser só fala com o backend via HTTP (`/api/...`). Rotas “públicas” são endpoints **sem JWT ERP**, listadas em `PUBLIC_ROUTES` do `authMiddleware`.

Problemas observados:

1. **Superfície de ataque** — qualquer pessoa pode chamar endpoints públicos (scraping, enumeração, abuso de CEP/CNPJ, stress).
2. **Hotsite acoplado à API** — `HomePlanosSection` faz `GET /api/public/saas-planos` em runtime; se a rota não estiver na whitelist ou houver bloqueio de auth, o site quebra.
3. **Token no browser não é segredo** — colocar um “token fixo” no `config.js` **não** protege de verdade (qualquer um lê o JS). Proteção real exige **não expor o dado** ou **endpoint só interno** (Nginx `internal` / injeção server-side).

---

## Inventário atual (rotas sem JWT ERP)

| Grupo | Rotas | Uso | Risco |
|-------|-------|-----|-------|
| **Hotsite** | `GET /api/public/saas-planos` | Home — tabela de planos | Baixo (dados de marketing), mas expõe estrutura de módulos/limites |
| **Branding** | `GET /api/dados-empresa/public`, `.../public/:slug`, `.../logo` | Login ERP, central assinante | Médio (nomes, slugs, logos) |
| **Formulários** | `GET /api/clientes/buscar-cep/:cep`, `consultar-cnpj/:cnpj`, `fornecedores/consultar-cnpj/:cnpj` | Cadastros no ERP | **Alto** (proxy para APIs externas, custo, abuso) |
| **Pagamento** | `POST /api/pagamento/session`, `GET /api/pagamento/:id...` | Boleto público | Médio — já usa token/sessão própria |
| **Central assinante** | `POST .../login`, `GET .../me`, PDFs legacy com token na URL | Portal do cliente | Médio — fluxo com auth própria |
| **Webhooks** | `/webhook`, `/api/assinatura-digital/webhook/*` | Integrações | Crítico — validar assinatura HMAC, não JWT |
| **Blockdomi TXT** | `/domain/*`, `/v4/all`, etc. | Listas RPKI | Restrito por IP (`blockdomiIpsPermitidosMiddleware`) |
| **Infra** | `/health`, `/api/health` | Monitoramento | Baixo |
| **Agente** | `GET /api/agents/:id/install-script`, `.../files/...` | Instalação remota | Token `X-Agent-Token` no handler |

Arquivos centrais hoje:

- `backend/src/middleware/authMiddleware/index.ts` — `PUBLIC_ROUTES`
- `backend/src/middleware/copyProtection/index.ts` — lista `publicRoutes` (header `X-API-Protected`)
- `frontend/src/services/publicHotsitePlanosService.ts` — fetch dos planos
- `frontend/src/services/dadosEmpresaService.ts` — `getPublic()` / `getPublicBySlug()`
- `backend/src/index.ts` — `GET /config.js`

---

## Objetivos da mudança

1. **Site institucional (ispconsultor.com.br / home)** — planos e dados de marketing **injetados pelo backend** ao servir a página, sem `fetch` público.
2. **APIs que continuarem expostas** — exigir **credencial adequada** (JWT, token de fluxo, assinatura webhook ou endpoint só interno), não “aberto na internet”.
3. **Reduzir lista `PUBLIC_ROUTES`** ao mínimo inevitável (health, webhooks com HMAC, login, fluxos que já têm token próprio).

---

## Proposta A — Hotsite sem API pública (recomendada)

### Ideia

O backend já gera `GET /config.js` **antes** do `authMiddleware`. Estender (ou criar arquivo irmão) para embutir dados do hotsite **no servidor**, chamando `SaasPlanoService.listForHotsite()` diretamente — sem HTTP público.

### Opção A1 — Estender `config.js`

```javascript
// Gerado em runtime pelo Express (exemplo)
window.__APP_CONFIG__ = { REACT_APP_API_URL: '/api', ... };
window.__HOTSITE_DATA__ = {
  planos: [ /* SaasPlanoService.listForHotsite() */ ],
  generatedAt: '2026-07-07T20:00:00-03:00'
};
```

**Frontend:** `HomePlanosSection` lê `window.__HOTSITE_DATA__.planos` (com fallback vazio se ausente). Remove `publicHotsitePlanosService` e a rota `/api/public/saas-planos`.

**Cache:** `Cache-Control: public, max-age=300` no `config.js` ou arquivo dedicado; invalidar ao salvar plano SaaS (`SaasPlanoController` / mutation → bump versão ou `res.clear`).

### Opção A2 — Arquivo dedicado `hotsite-data.js`

- `GET /hotsite-data.js` — mesmo padrão do `config.js`, só payload do hotsite.
- `index.html` inclui `<script src="/hotsite-data.js">` antes do bundle.
- Permite cache TTL diferente do `config.js`.

### Opção A3 — Nginx `auth_request` + endpoint **internal**

- Endpoint `GET /internal/hotsite-planos` no Node, acessível **somente** via `proxy_pass` com `internal;` no Nginx.
- Nginx monta JSON ao servir `/` (mais complexo, útil se o estático não passar pelo Node).

**Recomendação:** **A2** — separação clara, fácil de cachear e invalidar.

### Branding login (dados empresa operadora)

Mesmo padrão para dados usados **só na home/login ISP Consultor** (empresa operadora, não tenants):

- Incluir em `hotsite-data.js` ou `config.js`: `empresa: { nome, logo }` via `SaasDadosEmpresa` / operadora.
- Central do assinante **multiloja** continua precisando de slug dinâmico → ver Proposta C.

---

## Proposta B — Token para APIs que permanecerem públicas

> **Atenção:** token entregue no HTML/JS do browser **não é confidencial**. Serve apenas para **rate limit por origem**, dificultar scripts aleatórios ou exigir cookie de primeira visita — **não** substitui autenticação forte.

### B1 — JWT de sessão anônima (curta duração)

1. `GET /api/public/session` (única rota realmente aberta) retorna cookie HttpOnly `public_session` + CSRF.
2. Demais rotas “semi-públicas” exigem esse cookie.
3. TTL 15–30 min, renovado no carregamento da home.

**Prós:** browser envia cookie automaticamente.  
**Contras:** ainda abusável por bots; mais uma rota aberta.

### B2 — Exigir JWT ERP / SaaS onde possível

| Endpoint atual | Mudança |
|----------------|---------|
| `buscar-cep`, `consultar-cnpj` | **Somente com usuário logado** (JWT no cookie). Formulários públicos pré-login: usar API ViaCEP/Receita no frontend ou proxy com rate limit severo + captcha. |
| `dados-empresa/public` (ERP tenants) | Manter só para central assinante com slug; login ERP usa injeção server-side da operadora. |
| `public/saas-planos` | **Remover** após Proposta A. |

### B3 — Token de fluxo (já existente — manter padrão)

- Pagamento: token no body → cookie de sessão (`/api/pagamento/session`).
- Central assinante: token próprio pós-login.
- Webhooks: **HMAC** do provider, nunca JWT genérico.
- Agente: `X-Agent-Token` por equipamento.

---

## Proposta C — Central do assinante e multiloja

Não dá para injetar todos os tenants no build. Opções:

1. **Manter** `GET /api/dados-empresa/public/:slug` com **rate limit** + resposta mínima (nome, logo) — dados já são públicos na URL do slug.
2. Ou **subdomínio por tenant** com `config.js` por vhost (avançado).

Login e `me` da central já têm auth própria — não misturar com “token público genérico”.

---

## Proposta D — Endurecimento transversal (independente de A/B)

Checklist para qualquer rota que permanecer aberta:

- [ ] `publicEndpointRateLimitMiddleware()` (já usado em CEP/CNPJ e saas-planos)
- [ ] Remover de `PUBLIC_ROUTES` rotas que passarem a exigir JWT
- [ ] Resposta mínima (sem campos internos, IDs desnecessários)
- [ ] Logs de abuso (IP, path, rate limit 429)
- [ ] Não retornar stack trace / estrutura interna em produção
- [ ] Revisar `blockdomi-publico` e tokens de API de usuário (`API_TOKEN_ALLOWED_ROUTES`)
- [ ] Documentar exceções em um único módulo: `backend/src/constants/publicApiPolicy.ts` (futuro)

---

## Fases de implementação sugeridas

### Fase 1 — Hotsite sem fetch (impacto imediato no site)

1. Criar `GET /hotsite-data.js` em `backend/src/index.ts` (junto ao `config.js`).
2. Chamar `SaasPlanoService.listForHotsite()` no handler.
3. Alterar `HomePlanosSection` para ler `window.__HOTSITE_DATA__`.
4. Remover `publicHotsitePlanosService.ts` e rota `publicSaasPlanosRoutes`.
5. Remover entrada de `PUBLIC_ROUTES` e `copyProtection` para `/api/public`.
6. Invalidar cache ao criar/editar plano com `mostrar_hotsite` (hook no `SaasPlanoService.update`).

### Fase 2 — Branding login operadora

1. Incluir logo/nome da operadora em `hotsite-data.js` ou `config.js`.
2. Tela de login ISP Consultor deixa de chamar `getPublic()` quando `variant` for site principal.

### Fase 3 — CEP/CNPJ só autenticado

1. Remover `buscar-cep` / `consultar-cnpj` de `PUBLIC_ROUTES`.
2. Garantir que formulários ERP usam `defaultApiClient` com cookie JWT.
3. Avaliar captcha ou limite por IP para cadastro público futuro.

### Fase 4 — Consolidação e auditoria

1. Centralizar política em `publicApiPolicy.ts`.
2. Teste de regressão: home, login, central assinante, pagamento, webhooks.
3. Atualizar este doc e `.cursor/rules/backend-autenticacao.mdc` se virar padrão.

---

## Arquivos prováveis a alterar (quando implementar)

| Arquivo | Ação |
|---------|------|
| `backend/src/index.ts` | Novo handler `hotsite-data.js` |
| `backend/src/services/saas/SaasPlanoService/index.ts` | Hook invalidação cache |
| `backend/src/routes/publicSaasPlanosRoutes/` | Remover (após migração) |
| `backend/src/middleware/authMiddleware/index.ts` | Enxugar `PUBLIC_ROUTES` |
| `frontend/src/components/pages/home/HomePlanosSection.tsx` | Ler `window.__HOTSITE_DATA__` |
| `frontend/src/services/publicHotsitePlanosService.ts` | Remover |
| `frontend/index.html` ou template de build | `<script src="/hotsite-data.js">` |
| `scripts/install.sh` / Nginx | Garantir proxy de `/hotsite-data.js` para o backend (como `/config.js`) |

---

## Variáveis de ambiente (sugestão)

```env
# TTL do cache do payload do hotsite (segundos)
HOTSITE_DATA_CACHE_SECONDS=300

# Se true, mantém /api/public/saas-planos durante transição (deprecado)
ENABLE_LEGACY_PUBLIC_SAAS_PLANOS=false
```

---

## O que não fazer

- **Não** colocar “API key secreta” no bundle React achando que protege o backend.
- **Não** remover rate limit de CEP/CNPJ sem exigir autenticação.
- **Não** bloquear webhooks com JWT — usar validação de assinatura do provider.
- **Não** quebrar links legados de pagamento/central assinante sem período de deprecação.

---

## Critérios de aceite (quando concluir o plano)

- [ ] Home carrega planos **sem** request a `/api/public/*` no Network do browser.
- [ ] `/api/public/saas-planos` retorna 404 ou 410 (removido) em produção.
- [ ] Lista `PUBLIC_ROUTES` documentada e revisada; CEP/CNPJ exigem login ERP.
- [ ] Alteração de plano no SaaS reflete no site em até `HOTSITE_DATA_CACHE_SECONDS`.
- [ ] Central assinante, pagamento e webhooks continuam funcionando.

---

## Referências no código atual

- Whitelist auth: `backend/src/middleware/authMiddleware/index.ts`
- Planos hotsite: `backend/src/services/saas/SaasPlanoService/index.ts` → `listForHotsite()`
- Consumo frontend: `frontend/src/services/publicHotsitePlanosService.ts`
- Config dinâmica: `backend/src/index.ts` → `app.get('/config.js', ...)`
- Padrão similar (dados públicos tenant): `DadosEmpresaController.getPublic` / `getPublicBySlug`

---

*Última revisão: 2026-07-07 — proposta alinhada ao incidente de `/api/public/saas-planos` bloqueado pelo `authMiddleware`.*
