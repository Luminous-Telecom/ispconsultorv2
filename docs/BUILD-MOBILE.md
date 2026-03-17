# Build para Android e iOS (Capacitor)

O frontend é 100% web e é empacotado como app nativo usando [Capacitor](https://capacitorjs.com/).

## Sistema e Central do Assinante no mesmo app

O **mesmo build** inclui:
- **Sistema (ERP)** — rotas `/login`, `/adm`, `/saas`, etc.
- **Central do Assinante** — rota `/central-assinante/<slug>` (ex: `/central-assinante/minha-internet`)

O usuário abre o app e navega para a área desejada. A tela inicial (/) e o login levam ao sistema; a Central do Assinante é acessada por `/central-assinante/<slug>`.

Para ter **dois apps separados** (um só Sistema, outro só Central), seria necessário duplicar o projeto ou usar scripts de build com configs diferentes (appId, appName, startUrl).

---

## Configuração da API (obrigatório para app)

O app roda localmente e precisa da **URL completa** do backend:

```bash
export REACT_APP_API_URL=https://sua-api.empresa.com/api
```

---

## Android

### Requisitos

- Node.js 20+
- Android Studio
- JDK 17

### Build

```bash
cd frontend
REACT_APP_API_URL=https://sua-api.empresa.com/api npm run build:android
```

### Abrir no Android Studio

```bash
npm run cap:open:android
```

No Android Studio: Build → Build Bundle(s) / APK(s) para gerar o APK/AAB.

### Funciona em Linux

Diferente do iOS, o build Android roda em Linux/Windows.

---

## iOS

### Requisitos

- **Mac** com Xcode
- Node.js 20+
- CocoaPods: `sudo gem install cocoapods`

### Build

```bash
cd frontend
REACT_APP_API_URL=https://sua-api.empresa.com/api npm run build:ios
```

### Abrir no Xcode

```bash
npm run cap:open:ios
```

---

## Backend: CORS

No `.env` do backend:

```
ALLOWED_ORIGINS=https://app.empresa.com,https://localhost
```

O scheme `https` em `capacitor.config.ts` faz o app usar `https://localhost` como origem.

---

## Scripts disponíveis

| Script | Descrição |
|--------|-----------|
| `npm run build:android` | Build + sync para Android |
| `npm run build:ios` | Build + sync para iOS |
| `npm run cap:sync` | Sincroniza build para todas as plataformas |
| `npm run cap:open:android` | Abre o projeto no Android Studio |
| `npm run cap:open:ios` | Abre o projeto no Xcode |
