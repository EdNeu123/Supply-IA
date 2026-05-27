<div align="center">
  <h1>📦 Supply IA</h1>
  <p><strong>Gestão de Estoque & Cotação Automática com IA para MPEs</strong></p>
  <p>
    <img src="https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white" />
    <img src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white" />
    <img src="https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white" />
    <img src="https://img.shields.io/badge/Firebase-Firestore-FFCA28?logo=firebase&logoColor=black" />
    <img src="https://img.shields.io/badge/Telegram-Bot_API-26A5E4?logo=telegram&logoColor=white" />
    <img src="https://img.shields.io/badge/Gemini-AI-4285F4?logo=google&logoColor=white" />
  </p>
</div>

---

## O que é o Supply IA?

O Supply IA é um sistema de gestão de estoque e cotação automática voltado para micro e pequenas empresas (MPEs). Quando um produto atinge o ponto de pedido, o sistema dispara automaticamente cotações para os fornecedores via **Telegram**. O fornecedor responde em texto livre e a **IA (Gemini)** interpreta a resposta — extraindo preço, prazo e condições — e apresenta um comparativo ranqueado para o gestor aprovar com 1 clique.

---

## Stack

| Camada | Tecnologia |
|---|---|
| **Frontend** | React + TypeScript (Vite) + Tailwind CSS |
| **Autenticação** | Firebase Auth (e-mail/senha + Google) |
| **Banco de dados** | Cloud Firestore (NoSQL) |
| **Backend** | Node.js + TypeScript (serverless na Vercel) |
| **Integração** | Telegram Bot API (oficial, gratuita) |
| **Inteligência Artificial** | Google Gemini API |
| **Hospedagem Frontend** | Firebase Hosting |
| **Hospedagem Backend** | Vercel (serverless) |

---

## Estrutura do Projeto

```
Supply IA/
├── frontend/               # Aplicação React (Vite)
│   ├── public/             # Arquivos estáticos (logos)
│   ├── src/
│   │   ├── app/            # Rotas
│   │   ├── components/     # Layout e componentes UI
│   │   ├── config/         # Firebase config
│   │   ├── models/         # Tipos TypeScript
│   │   ├── pages/          # Landing, Login, Cadastro, Dashboard, Produtos, Fornecedores, Cotações, Compras
│   │   ├── services/       # Chamadas à API
│   │   └── store/          # Estado global (Zustand)
│   └── ...configs
│
└── backend/                # API serverless (Vercel)
    ├── api/
    │   └── index.ts        # Entry point
    ├── scripts/
    │   ├── seed.ts         # Dados de demonstração
    │   └── setWebhook.ts   # Configura webhook Telegram
    └── src/
        ├── config/         # Firebase Admin + env
        ├── controllers/    # Handlers das rotas
        ├── middlewares/    # Auth + Error handler
        ├── models/         # CRUD Firestore
        ├── routes/         # Definição das rotas
        └── services/       # Lógica de negócio (IA, Telegram, ponto de pedido)
```

---

## Pré-requisitos

- Node.js 18+
- Conta Google (Firebase + Gemini)
- Conta Vercel
- Conta Telegram

---

## Configuração Local

### 1. Clone e instale

```bash
git clone https://github.com/SEU_USER/supply-ia.git
cd "Supply IA"

# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Variáveis de ambiente

**`backend/.env`** (copie de `.env.example`):
```env
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=

TELEGRAM_BOT_TOKEN=
BOT_USERNAME=
TELEGRAM_WEBHOOK_URL=
TELEGRAM_WEBHOOK_SECRET=

GEMINI_API_KEY=
```

**`frontend/.env`** (copie de `.env.example`):
```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_API_URL=http://localhost:3000/api
```

> **Como obter cada chave:** consulte o Guia de Configuração completo na wiki do projeto ou no PDF de setup.

### 3. Rodar localmente

```bash
# Terminal 1 — Backend
cd backend
npm run dev
# ✅ Supply IA API rodando na porta 3000

# Terminal 2 — Frontend
cd frontend
npm run dev
# Acesse: http://localhost:5173
```

### 4. Popular com dados de demonstração

```bash
# 1. Crie uma conta pelo frontend (http://localhost:5173/cadastro)
# 2. Copie seu UID no Firebase Console → Authentication
cd backend
npm run seed SEU_UID_AQUI
```

---

## Deploy

### Backend (Vercel)

```bash
# Configure o Root Directory como "backend" na Vercel
# Adicione todas as variáveis de ambiente no painel da Vercel
# Após o deploy, atualize TELEGRAM_WEBHOOK_URL e rode:
npm run set-webhook
```

### Frontend (Firebase Hosting)

```bash
npm install -g firebase-tools
firebase login

# Atualize VITE_API_URL com a URL da Vercel no frontend/.env
cd frontend && npm run build
cd ..
firebase init hosting   # public: frontend/dist | SPA: yes
firebase deploy --only hosting
```

---

## Rotas da API

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/health` | Health check |
| `GET/POST/PUT/DELETE` | `/api/products` | CRUD Produtos |
| `GET/POST/PUT/DELETE` | `/api/suppliers` | CRUD Fornecedores |
| `GET/POST` | `/api/rfqs` | Listar / Disparar cotação |
| `GET/POST` | `/api/quotes` | Listar / Simular resposta |
| `GET/POST/PUT` | `/api/purchase-orders` | Ordens de compra |
| `POST` | `/api/webhook/telegram` | Webhook público (Telegram) |

> Todas as rotas exceto o webhook exigem `Authorization: Bearer <Firebase ID Token>`.

---

## Fluxo Principal

```
Gestor cadastra produto e fornecedor
       ↓
Sistema calcula ponto de pedido automaticamente
       ↓
Estoque cai abaixo do limite → RFQ disparada via Telegram
       ↓
Fornecedor responde em texto livre
       ↓
Gemini extrai preço, prazo e condições → JSON estruturado
       ↓
Comparativo ranqueado aparece no painel
       ↓
Gestor aprova → Ordem de compra gerada
```

---

## Desenvolvido em

Hackathon de Inovação — Análise e Desenvolvimento de Sistemas (ADS)

---

<div align="center">
  <p>Feito com ☕ e muito TypeScript</p>
</div>
