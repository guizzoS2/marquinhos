# Marquinho's

Dashboard do Marquinho's Bar e Petiscos. React + Firebase (Auth/Firestore), com fallback local quando as envs não estão setadas.

## Stack

- **client**: Vite + React + Tailwind + React Router + React Query + Firebase
- Design system: amarelo `#FFDB15`, branco e preto (`client/tailwind.config.js`)

## Firebase

Copie `client/.env.example` → `client/.env` e preencha:

```
FIREBASE_API_KEY=
FIREBASE_AUTH_DOMAIN=
FIREBASE_PROJECT_ID=
FIREBASE_STORAGE_BUCKET=
FIREBASE_MESSAGING_SENDER_ID=
FIREBASE_APP_ID=
```

Não use prefixo `VITE_` — o Vite injeta essas vars no bundle do browser.

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
