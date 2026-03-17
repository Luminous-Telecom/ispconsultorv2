# Build para iOS (Capacitor)

O frontend é 100% web e é empacotado como app nativo iOS usando [Capacitor](https://capacitorjs.com/).

## Requisitos

- **Mac** com Xcode (build iOS requer macOS)
- Node.js 20+
- CocoaPods: `sudo gem install cocoapods`

## Configuração da API (obrigatório para app)

O app iOS roda localmente e precisa da **URL completa** do backend. Defina antes do build:

```bash
export REACT_APP_API_URL=https://sua-api.empresa.com/api
npm run build:ios
```

## Passos para gerar o app

1. **Build com URL da API:**
   ```bash
   cd frontend
   REACT_APP_API_URL=https://sua-api.empresa.com/api npm run build:ios
   ```

2. **Ou em dois passos:**
   ```bash
   REACT_APP_API_URL=https://sua-api.empresa.com/api npm run build
   npm run cap:sync
   ```

3. **Abrir no Xcode (no Mac):**
   ```bash
   npm run cap:open
   ```

4. No Xcode: selecione um simulador ou dispositivo, clique em Run (▶) para compilar e executar.

## Backend: CORS

No `.env` do backend, inclua a origem do app iOS em `ALLOWED_ORIGINS`:

```
ALLOWED_ORIGINS=https://app.empresa.com,https://localhost
```

O scheme `https` (configurado em `capacitor.config.ts`) faz o app usar `https://localhost` como origem, evitando problemas de CORS.

## Estrutura

- `capacitor.config.ts` — configuração do Capacitor (appId, webDir, scheme)
- `ios/` — projeto Xcode gerado (versionado no git)
- O build web é copiado para `ios/App/App/public` em cada `cap sync`

## Scripts disponíveis

| Script | Descrição |
|--------|-----------|
| `npm run build:ios` | Build + sync para iOS |
| `npm run cap:sync` | Sincroniza build atual para o projeto iOS |
| `npm run cap:open` | Abre o projeto no Xcode |
