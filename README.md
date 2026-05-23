# Dev Tracker

App pessoal de acompanhamento de rotina, desenvolvimento e bem-estar com análise via IA (Gemini).

Multi-usuário: Leo (dev) e Rafa (psicóloga) com perfis, temas e prompts distintos.

---

## Stack

- **Frontend:** React + Vite — Vercel (https://dev-tracker-iota.vercel.app)
- **Backend:** .NET 8 + EF Core — Render Docker free tier (https://leo-dev-tracker-api.onrender.com)
- **Banco:** Neon (PostgreSQL serverless)
- **IA:** Google Gemini 2.5 Flash (insights diários) e Gemini 2.5 Pro (análise semanal)
- **Auth:** JWT Bearer, tokens de 30 dias
- **Rate limiting:** 60 req/min por IP

---

## Setup local

### Pré-requisitos

- Node.js 18+
- .NET 8 SDK
- PostgreSQL 14+ (ou conta no Neon)
- Chave de API do Google Gemini (aistudio.google.com)

### Backend

```bash
cd backend/LeoDevTracker.API
cp appsettings.example.json appsettings.json
# Preencha: connection string, Gemini API key, JWT secret, senhas dos usuários
dotnet ef database update
dotnet run
```

### Frontend

```bash
cd frontend
cp .env.example .env   # já vem com localhost:5145
npm install
npm run dev
```

---

## Deploy (produção atual)

| Serviço | Plataforma | URL |
|---|---|---|
| Frontend | Vercel | https://dev-tracker-iota.vercel.app |
| Backend | Render (Docker, free) | https://leo-dev-tracker-api.onrender.com |
| Banco | Neon (PostgreSQL) | ep-snowy-frog-acm1rduz.sa-east-1.aws.neon.tech |

### Variáveis de ambiente — Render

```
DB_HOST=ep-snowy-frog-acm1rduz.sa-east-1.aws.neon.tech
DB_NAME=neondb
DB_USER=neondb_owner
DB_PASS=<senha>

GeminiApi__ApiKey=<chave>

Jwt__Secret=<secret 32+ chars>
Jwt__Issuer=LeoDevTracker
Jwt__Audience=LeoDevTrackerApp
Jwt__ExpiracaoHoras=720

Usuarios__leo=<senha>
Usuarios__rafa=<senha>

ASPNETCORE_ENVIRONMENT=Production
ASPNETCORE_URLS=http://+:$PORT

DOTNET_GCHeapHardLimit=209715200
DOTNET_GCConserveMemory=9
```

### Variáveis de ambiente — Vercel

```
VITE_API_URL=https://leo-dev-tracker-api.onrender.com/api
```

### Observações de deploy

- **Render free tier** hiberna após 15 min — primeira requisição demora ~30s para acordar o serviço
- **Migrations** rodam automaticamente no boot em produção (try/catch para não crashar se falhar)
- **CORS** configurado com `AllowAnyOrigin` — segurança garantida pelo JWT
- **Supabase descartado:** incompatível com Render free tier (IPv6 bloqueado)
- **Railway descartado:** trial encerrado

---

## Segurança

- `appsettings.json` está no `.gitignore` — nunca commitar com dados reais
- `frontend/.env` está no `.gitignore` — nunca commitar
- Senhas dos usuários ficam apenas em variáveis de ambiente (não no banco)
- Tokens JWT expiram em 30 dias (configurável via `Jwt__ExpiracaoHoras`)
- Isolamento total por usuário: registros, projetos, metas, análises e rotina

---

## Estrutura

```
leo-dev-tracker/
├── backend/
│   └── LeoDevTracker.API/
│       ├── Controllers/    # Auth, Registros, Analise, Projetos, Metas, Financeiro, Rotina
│       ├── Models/         # RegistroDiario, Projeto, MetaFinanceira, AnaliseSemanal, RotinaSlot
│       ├── Services/       # IAiService, GeminiService, AnaliseService
│       ├── Data/           # AppDbContext + migrations
│       ├── Helpers/        # UsuarioHelper
│       └── Dockerfile
└── frontend/
    └── src/
        ├── components/     # Dashboard, DailyForm, TrainingPanel, WeeklyReport, WeeklyGrid...
        ├── pages/          # Home, Register, History, Login
        ├── contexts/       # AuthContext
        └── services/       # api.js
```

---

## Problemas comuns

**Render 500 em todas as rotas:**
Verificar se as variáveis `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASS` estão setadas. Connection string com quebra de linha causa `KeyNotFoundException` no Npgsql.

**Render hiberna (cold start):**
Acessar `https://leo-dev-tracker-api.onrender.com/` no browser para acordar o serviço antes de usar o app.

**CORS error no browser:**
Verificar se o frontend está na URL de produção do Vercel (não URL de preview com hash).

**Gemini retornando 403:**
Testar a chave em aistudio.google.com antes de depurar o código.

**Frontend não conecta no backend:**
Verificar `VITE_API_URL` no Vercel. Se foi setada após o primeiro deploy, é necessário redeployar para o Vite embutir a URL correta no bundle.

---

## Custo mensal estimado

| Serviço | Plano | Custo |
|---|---|---|
| Neon | Free (0.5GB) | $0 |
| Render | Free tier | $0 |
| Vercel | Free (hobby) | $0 |
| Gemini API | Free tier ou pay-as-you-go | $0–$0.50 |
