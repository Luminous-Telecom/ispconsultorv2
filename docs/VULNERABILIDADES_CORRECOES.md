# Relatório de Vulnerabilidades — Separação de Responsabilidades

**Sistema:** BackNet - backnet.app  
**Stack:** React + Node.js/Express + Nginx + Cloudflare

---

## ☁️ Configurar no Cloudflare

Estes itens devem ser configurados no painel do Cloudflare (Dashboard → seu domínio):

| # | Ação | Onde no Cloudflare | Prioridade |
|---|------|--------------------|-----------|
| 1 | **CSP mais restrita** — Remover `unsafe-inline`/`unsafe-eval` ou reforçar CSP | Transform Rules → Modify Response Header (sobrescrever CSP se backend não conseguir) | 🔴 Alta |
| 2 | **GraphQL** — Bloquear `/graphql` (retornar 404) se não for usado | Page Rules ou Transform Rules | 🔴 Alta |
| 3 | **Retornar 404 para paths de scan** — `/wp-admin`, `/phpmyadmin`, `/.env`, `/.git/config` | Page Rules ou Redirect Rules (Custom: 404) | 🟡 Baixa |
| 4 | **security.txt** — Servir em `/.well-known/security.txt` | Workers ou static asset (se disponível) | 🟡 Baixa |
| 5 | **Remover header Server** | Transform Rules → Remove Response Header `Server` | 🟡 Baixa |
| 6 | **CORS** — Garantir que OPTIONS não retorne 500 | Verificar se Cloudflare não está interceptando OPTIONS | 🟠 Média |
| 7 | **HSTS, X-Frame-Options, etc.** | Já configurados ✅ | — |

### Exemplo de security.txt (Cloudflare Workers)

```txt
Contact: mailto:security@backnet.app
Expires: 2026-12-31T23:59:59.000Z
Preferred-Languages: pt-BR, en
```

---

## 📁 Corrigir no Código e Nginx

Estes itens foram ou devem ser corrigidos no repositório.

### ✅ Corrigido neste commit

| # | Ação | Arquivo(s) |
|---|------|------------|
| 1 | Remover `unsafe-eval` da CSP (unsafe-inline mantido por compatibilidade com CRA) | `backend/src/index.ts` |
| 2 | Sanitizar erros em produção (404 genérico, sem expor `path`) | `backend/src/index.ts` |
| 2b | Sanitizar mensagens de erro 5xx e details em produção | `responseUtils`, `errorHandlerMiddleware` |
| 3 | Adicionar header `X-Request-ID` para rastreabilidade | `backend/src/index.ts` |
| 4 | `server_tokens off` no nginx | `nginx/nginx.conf` |
| 5 | Retornar 404 para paths de scan conhecidos | `nginx/nginx.conf` |
| 6 | Criar `security.txt` e servir via nginx | `public/security.txt`, `nginx/nginx.conf` |
| 7 | Fluxo de pagamento: token em POST body, cookie de sessão, URL limpa | `PagamentoPublicoController`, `PagamentoPublico.tsx` |

### ⚠️ Requer mudanças maiores (documentado)

| # | Ação | Nota |
|---|------|------|
| 1 | **CSP unsafe-inline** | Create React App injeta estilos inline. Migrar para nonces/hashes ou build tool que suporte CSP strict. |
| 2 | **Migrar JWT para httpOnly cookies** | O backend já suporta cookies. Verificar se o frontend usa `localStorage` para token e migrar. |
| 3 | **Verificação de role no backend** | EmpresaController e AtualizacoesController já verificam. Auditar outras rotas sensíveis. |

---

## 📋 Não aplicável / Fora do escopo

| # | Item | Motivo |
|---|------|--------|
| GraphQL | O projeto **não usa GraphQL**. O 405 em `/graphql` pode vir de outro serviço ou do Cloudflare. Bloquear no Cloudflare. |
| Tokens no bundle | São **labels de formulário** (i18n: "API Key", "Client Secret"), não chaves reais. Auditar se há `.env` ou secrets no build. |
