c# Como Testar o Frontend em Desenvolvimento

Este guia explica as diferentes formas de testar o frontend durante o desenvolvimento.

## Opções de Desenvolvimento

### Opção 1: Frontend Separado (Recomendado para desenvolvimento)

Rodar frontend e backend separadamente para ter hot-reload e desenvolvimento mais rápido.

#### Passo a Passo

1. **Configurar variáveis de ambiente do frontend:**

```bash
cd frontend
cp env.example .env
```

Edite o `.env`:
```env
PORT=3000
REACT_APP_API_URL=http://localhost:3001/api
```

2. **Iniciar o backend:**

```bash
cd backend
npm run dev
# Backend rodando em http://localhost:3001
```

3. **Iniciar o frontend em modo desenvolvimento:**

```bash
cd frontend
npm run dev
# Frontend rodando em http://localhost:3000
```

4. **Acessar:**

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001/api

#### Vantagens

- ✅ **Hot-reload**: Mudanças no código recarregam automaticamente
- ✅ **Fast Refresh**: Estado do React é preservado durante edições
- ✅ **Source Maps**: Debugging fácil no navegador
- ✅ **Erros visuais**: Overlay de erros no navegador
- ✅ **Desenvolvimento rápido**: Não precisa rebuildar a cada mudança

#### Como Funciona

- `react-scripts start` cria um servidor de desenvolvimento
- Usa `process.env.REACT_APP_API_URL` do `.env` do frontend
- Faz requisições para `http://localhost:3001/api` (backend)

---

### Opção 2: Frontend Integrado no Backend

Rodar frontend buildado integrado no backend (simula produção).

#### Passo a Passo

1. **Build do frontend:**

```bash
cd frontend
npm run build
```

2. **Configurar backend:**

Certifique-se que o `.env` do backend tem:
```env
REACT_APP_API_URL=http://localhost:3001/api
```

3. **Iniciar backend (serve frontend integrado):**

```bash
cd backend
npm run dev
# Backend + Frontend rodando em http://localhost:3001
```

4. **Acessar:**

- Aplicação completa: http://localhost:3001
- Backend API: http://localhost:3001/api

#### Vantagens

- ✅ **Simula produção**: Mesmo comportamento de produção
- ✅ **Uma única porta**: Tudo em um lugar
- ✅ **Testa integração**: Verifica se frontend integrado funciona

#### Desvantagens

- ❌ **Sem hot-reload**: Precisa rebuildar a cada mudança
- ❌ **Mais lento**: Build leva tempo

---

### Opção 3: Usando o Script `start` (Frontend Buildado)

Rodar frontend buildado com `server.js` (sem integração no backend).

#### Passo a Passo

1. **Build do frontend:**

```bash
cd frontend
npm run build
```

2. **Configurar `.env` do frontend:**

```env
PORT=3000
REACT_APP_API_URL=http://localhost:3001/api
```

3. **Iniciar backend:**

```bash
cd backend
npm run dev
```

4. **Iniciar frontend:**

```bash
cd frontend
npm start
# Frontend rodando em http://localhost:3000
```

#### Quando Usar

- Testar frontend buildado antes de integrar no backend
- Verificar se `server.js` funciona corretamente
- Testar configuração dinâmica via `/config.js`

---

## Comparação das Opções

| Aspecto | `npm run dev` | Integrado Backend | `npm start` |
|---------|---------------|-------------------|-------------|
| **Hot-reload** | ✅ Sim | ❌ Não | ❌ Não |
| **Velocidade** | ⚡ Muito rápido | 🐢 Lento (rebuild) | 🐢 Lento (rebuild) |
| **Portas** | 2 (3000 + 3001) | 1 (3001) | 2 (3000 + 3001) |
| **Uso** | Desenvolvimento | Teste produção | Teste build |
| **Configuração** | `.env` frontend | `.env` backend | `.env` frontend |

---

## Configuração de Variáveis de Ambiente

### Frontend (`.env`)

```env
# Porta do servidor de desenvolvimento (apenas para npm run dev)
PORT=3000

# URL da API do backend
REACT_APP_API_URL=http://localhost:3001/api

# Opcional: timeouts e retries
REACT_APP_API_TIMEOUT=10000
REACT_APP_API_RETRY_ATTEMPTS=3
REACT_APP_API_RETRY_DELAY=1000
```

### Backend (`.env`)

```env
# Porta do backend
PORT=3001

# URL da API (usado quando frontend está integrado)
REACT_APP_API_URL=http://localhost:3001/api

# URL do frontend (opcional quando integrado)
# FRONTEND_URL=http://localhost:3000
```

---

## Troubleshooting

### CORS Errors

Se aparecer erro de CORS ao usar `npm run dev`:

1. Verifique se `FRONTEND_URL` está no `.env` do backend:
```env
FRONTEND_URL=http://localhost:3000
```

2. Reinicie o backend após alterar `.env`

### `REACT_APP_API_URL` não funciona

1. Certifique-se que o `.env` está na pasta `frontend/`
2. Variáveis devem começar com `REACT_APP_`
3. Reinicie o servidor de desenvolvimento após alterar `.env`

### Porta já em uso

Se a porta 3000 estiver ocupada:

```bash
# Linux/Mac
PORT=3002 npm run dev

# Ou edite o .env
PORT=3002
```

### Frontend não conecta com backend

1. Verifique se backend está rodando: `curl http://localhost:3001/health`
2. Verifique `REACT_APP_API_URL` no `.env` do frontend
3. Verifique console do navegador para erros

---

## Fluxo Recomendado

### Durante Desenvolvimento

```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend (hot-reload)
cd frontend
npm run dev
```

### Antes de Commitar

```bash
# Testar build integrado
cd frontend && npm run build
cd ../backend && npm run build
cd backend && npm start
# Testar em http://localhost:3001
```

---

## Dicas

1. **Use `npm run dev`** para desenvolvimento diário (mais rápido)
2. **Teste build integrado** antes de fazer deploy
3. **Mantenha `.env` atualizado** em ambos frontend e backend
4. **Use diferentes portas** se rodar múltiplos projetos
5. **Verifique logs** do backend e console do navegador para debug

