# Leo Dev Tracker

App pessoal de acompanhamento diário de produtividade, treino, humor e finanças. Usado por Leo (dev) e Rafa (psicóloga).

## Stack

| Camada    | Tecnologia                          |
|-----------|-------------------------------------|
| Frontend  | React 18 + Vite, Recharts           |
| Backend   | .NET 8, ASP.NET Core, EF Core       |
| Banco     | PostgreSQL (Neon)                   |
| IA        | Google Gemini 2.5 Flash             |
| Deploy    | Vercel (frontend) + Render (backend)|

## Funcionalidades

- **Registro diário**: humor, estudo, trabalho, treino, reflexão
- **Análise semanal** via IA (Gemini) — disponível a cada 3 dias
- **Insight diário** gerado automaticamente ao salvar o registro
- **Modo cuidado Rafa**: comportamento adaptado quando humor médio ≤ 2 nos últimos 3 registros
- **Análise de extrato bancário** por texto ou PDF (categorização automática)
- **Metas financeiras** com aporte rápido e barra de progresso
- **Projetos pessoais** com percentual e próximo passo
- **Rotina semanal** — grade 7×3 (dia × período) editável
- **Gráficos**: horas de estudo, humor, sono (Rafa), tópicos estudados, consistência de treino

## Estrutura

```
leo-dev-tracker/
├── frontend/          # React + Vite
│   └── src/
│       ├── components/
│       ├── contexts/
│       ├── hooks/
│       ├── pages/
│       ├── services/api.js
│       └── utils/linguagem.js
└── backend/
    └── LeoDevTracker.API/
        ├── Controllers/
        ├── Services/      # GeminiService, AnaliseService
        ├── Models/
        ├── Helpers/       # ExtrasHelper, UsuarioHelper
        └── Data/          # AppDbContext, EF Migrations
```

## Variáveis de ambiente

### Backend (Render — Environment Variables)

| Variável                    | Descrição                              |
|-----------------------------|----------------------------------------|
| `ConnectionStrings__DefaultConnection` | Connection string PostgreSQL  |
| `GeminiApi__ApiKey`         | API key do Google Gemini               |
| `Jwt__Secret`               | Segredo JWT (mínimo 32 chars)          |
| `Usuarios__leo`             | Hash BCrypt da senha do Leo            |
| `Usuarios__rafa`            | Hash BCrypt da senha da Rafa           |
| `AllowedOrigins__0`         | `https://dev-tracker-iota.vercel.app`  |

### Frontend (Vercel)

| Variável          | Valor                                          |
|-------------------|------------------------------------------------|
| `VITE_API_URL`    | `https://leo-dev-tracker-api.onrender.com/api` |

## Autenticação

JWT com 30 dias de validade. Senhas armazenadas como hash BCrypt. Usuários definidos nas variáveis de ambiente (não há cadastro público).

## Segurança

- `appsettings.json` está no `.gitignore` — nunca commitar
- Credenciais reais ficam apenas nas env vars do Render
- CORS restrito às origens listadas em `AllowedOrigins`

## Deploy

```bash
# Frontend — push para main sobe automaticamente no Vercel
git push origin main

# Backend — Render faz deploy automático via GitHub
# Para forçar rebuild: Render dashboard → Manual Deploy
```

## Observações de operação

- O Render (free tier) hiberna após 15 min sem requests. Configure um cron externo para `GET /health` a cada 10 min.
- `GET /api/health` é público e retorna `{ status: "ok", ts: "..." }`.
- Análise semanal tem cooldown de 3 dias por usuário.
- PDF de extrato usa PdfPig para extração de texto — PDFs escaneados (imagem) não funcionam.
