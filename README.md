# Marquinho's

Dashboard do Marquinho's Bar e Petiscos. React + Firebase (Auth/Firestore), com fallback local quando as envs não estão setadas.

## Stack

- **client**: Vite + React + Tailwind + React Router + React Query + Firebase
- Design system: amarelo `#FFDB15`, branco e preto (`client/tailwind.config.js`)

## Firebase

Copie `client/.env.example` → `client/.env` e preencha:

```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

Sem Firebase: modo local (`localStore`) + login demo.

## Login demo (modo local)

- E-mail: `fabio@marquinhos.local`
- Senha: `admin123`

## Rodar

```bash
cd client && npm run dev
```

## Rotas

- `/` Visão Geral
- `/fluxo-caixa` Fluxo de Caixa
- `/estoque` Estoque
- `/freelancers` Freelancers
- `/perfil` Perfil
- `/login` Login
