# Dev Tracker

App pessoal de acompanhamento de rotina, desenvolvimento e bem-estar com análise via IA (Gemini).

Multi-usuário: Leo (dev) e Rafa (psicóloga) com perfis, temas e prompts distintos.

---

## Stack

- **Frontend:** React + Vite (porta 5173 local)
- **Backend:** .NET 8 + EF Core + PostgreSQL (porta 5145 local)
- **IA:** Google Gemini 2.5 Flash (insights diários) e Gemini 2.5 Pro (análise semanal)
- **Auth:** JWT Bearer, tokens de 30 dias
- **Rate limiting:** 60 req/min por IP

---

## Setup local

### Pré-requisitos

- Node.js 18+
- .NET 8 SDK
- PostgreSQL 14+
- Chave de API do Google Gemini ([aistudio.google.com](https://aistudio.google.com))

### Backend

```bash
cd backend/LeoDevTracker.API

# Copie e edite o arquivo de configuração
cp appsettings.example.json appsettings.json
# Preencha: connection string, Gemini API key, JWT secret, senhas dos usuários

# Aplique as migrations
dotnet ef database update

# Rode
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

## Deploy — Railway + Supabase + Vercel

**Ordem obrigatória:** Supabase → Railway → Vercel. Cada etapa depende da anterior.

---

### ETAPA 1 — Supabase (banco)

1. Acesse [supabase.com](https://supabase.com) e crie uma conta
2. Clique em **New project**, escolha um nome e uma senha forte — **guarde essa senha**
3. Aguarde o projeto inicializar (~2 minutos)
4. Vá em **Settings → Database → Connection string → URI** e copie a string
5. Converta para o formato do Npgsql (usado pelo EF Core):

```
Host=db.xxxxxxxxxxxx.supabase.co;Database=postgres;Username=postgres;Password=SUA-SENHA;SSL Mode=Require;Trust Server Certificate=true
```

Guarde essa string — vai entrar no Railway como variável de ambiente.

---

### ETAPA 2 — Railway (backend)

1. Acesse [railway.app](https://railway.app) e crie uma conta com GitHub
2. Clique em **New Project → Deploy from GitHub repo** e selecione o repositório
3. Railway detecta .NET automaticamente
4. Em **Settings**, configure:

**Root Directory:** `backend/LeoDevTracker.API`

5. Em **Variables**, adicione:

```
ConnectionStrings__DefaultConnection=Host=db.xxxx.supabase.co;Database=postgres;Username=postgres;Password=SUA-SENHA;SSL Mode=Require;Trust Server Certificate=true

GeminiApi__ApiKey=AIza...

Jwt__Secret=gere-uma-string-aleatoria-aqui-minimo-32-chars
Jwt__ExpiracaoHoras=720

Usuarios__leo=senha-forte-do-leo
Usuarios__rafa=senha-forte-da-rafa

AllowedOrigin=https://seu-app.vercel.app

ASPNETCORE_ENVIRONMENT=Production
ASPNETCORE_URLS=http://+:$PORT
```

> Para gerar o `Jwt__Secret`: `openssl rand -base64 32` no terminal.

6. Em **Settings → Networking**, clique em **Generate Domain** para obter a URL pública
7. **Guarde essa URL** — vai entrar no Vercel

> As migrations rodam automaticamente no primeiro boot em produção (código já configurado em `Program.cs`).

---

### ETAPA 3 — Vercel (frontend)

1. Acesse [vercel.com](https://vercel.com) e crie conta com GitHub
2. Clique em **New Project → Import Git Repository**
3. Selecione o repositório e configure:

| Campo | Valor |
|---|---|
| Root Directory | `frontend` |
| Framework Preset | Vite |
| Build Command | `npm run build` |
| Output Directory | `dist` |

4. Em **Environment Variables**, adicione:

```
VITE_API_URL=https://nomeapp.up.railway.app/api
```

5. Faça o deploy e copie a URL gerada (ex: `https://dev-tracker.vercel.app`)
6. Volte no Railway e atualize `AllowedOrigin` com essa URL exata
7. Force um redeploy no Railway para o CORS atualizar

---

### ETAPA 4 — Checklist pós-deploy

Teste nessa ordem no browser:

- [ ] `https://dev-tracker.vercel.app/login` — tela de login aparece
- [ ] Login com `leo` — dashboard carrega, tema indigo
- [ ] Criar um registro diário — salva e retorna insight da IA
- [ ] Login com `rafa` — dashboard carrega, tema roxo
- [ ] Gerar análise semanal — retorna sem erro 500
- [ ] Colar extrato bancário (só Leo) — retorna análise financeira
- [ ] `https://nomeapp.up.railway.app/swagger` — documentação da API aparece

---

### Problemas comuns

**CORS error no browser:**
`AllowedOrigin` no Railway não bate com a URL exata do Vercel. Deve ser sem barra no final: `https://app.vercel.app` (não `https://app.vercel.app/`).

**Migration falhou no Supabase:**
A connection string precisa ter `SSL Mode=Require;Trust Server Certificate=true`.

**Railway dando erro de build:**
Verificar se o `Root Directory` aponta para a pasta onde fica o `.csproj`.

**Gemini retornando 403:**
Testar a chave primeiro em [aistudio.google.com](https://aistudio.google.com) antes de depurar o código.

**Frontend não conecta no backend:**
Abrir DevTools → Network e verificar se as requisições vão para a URL certa. Se `VITE_API_URL` não estava setada antes do build, o Vite embutiu a URL errada no bundle — faça redeploy no Vercel após setar a variável.

---

### Custo mensal estimado

| Serviço | Plano | Custo |
|---|---|---|
| Supabase | Free (500MB, 2 projetos) | $0 |
| Railway | Hobby ($5 crédito/mês incluído) | $0–$5 |
| Vercel | Free (hobby) | $0 |
| Gemini API | Free tier ou pay-as-you-go | $0–$0.50 |

---

## Segurança

- `appsettings.json` está no `.gitignore` — nunca commitar com dados reais
- `frontend/.env` está no `.gitignore` — nunca commitar
- Senhas dos usuários ficam apenas no `appsettings.json` (não no banco)
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
│       └── Helpers/        # UsuarioHelper
└── frontend/
    └── src/
        ├── components/     # Dashboard, DailyForm, TrainingPanel, WeeklyReport, WeeklyGrid...
        ├── pages/          # Home, Register, History, Login
        ├── contexts/       # AuthContext
        └── services/       # api.js
```
