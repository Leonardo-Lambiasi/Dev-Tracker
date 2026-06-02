# Leo Dev Tracker

App pessoal de acompanhamento diário de produtividade, treino, humor e finanças. Usado por Leo (dev) e Rafa (psicóloga).

## Stack

| Camada    | Tecnologia                                        |
|-----------|---------------------------------------------------|
| Frontend  | React 18 + Vite 6, React Router 6, Recharts 2    |
| Backend   | .NET 8, ASP.NET Core, EF Core 8                  |
| Banco     | PostgreSQL (Neon)                                 |
| IA        | Google Gemini 2.5 Flash (via `Google.GenAI`)     |
| PDF       | QuestPDF (geração) + UglyToad.PdfPig (extração)  |
| Deploy    | Vercel (frontend) + Render (backend)              |

## Funcionalidades

- **Registro diário**: humor, estudo, trabalho, treino, reflexão — insight IA gerado automaticamente ao salvar
- **Modo cuidado Rafa**: comportamento adaptado quando humor médio ≤ 2 nos últimos registros
- **Análise semanal via IA** — intervalo dinâmico (desde `SemanaFim` da última análise, mínimo 7 dias). Saída em 4 seções: Visão Geral / Destaques / Padrões Preocupantes / Foco para o próximo período. Máximo 400 palavras, sem emojis
- **Análise de extrato bancário** via texto ou PDF — retorna resumo, categorias, maiores gastos, projeção, ações concretas, alertas e impacto nas metas financeiras
- **Metas financeiras** com aporte rápido e barra de progresso; cruzadas com análise de extrato
- **Projetos pessoais** com percentual, próximo passo e status
- **Rotina semanal** — grade 7×3 (dia × período) com suporte a **slots recorrentes**: borda tracejada, ícone ↻, expansão automática nos dias configurados, opção "editar só este" ou "editar todos"
- **Exportação PDF** dos últimos 7 dias — um card por dia com humor, treino, estudo, insight; nome do arquivo `devtracker-historico-DD-MM-YYYY.pdf`
- **Aderência à rotina** (Rafa) — checkin por slot, histórico semanal e gráfico de tendência
- **Gráficos**: horas de estudo, humor, sono (Rafa), tópicos estudados, lazer por semana (Rafa), aderência à rotina (Rafa)
- **Rate limiting**: máximo 10 tentativas de login por IP por minuto (HTTP 429 com mensagem em português)
- **Log de falhas de auth**: usuário + IP + timestamp via `ILogger` a cada senha incorreta

## Estrutura

```
leo-dev-tracker/
├── .gitignore
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── DailyForm.jsx
│       │   ├── Dashboard.jsx
│       │   ├── ExtratoPanel.jsx
│       │   ├── FinancePanel.jsx
│       │   ├── FocoProjetos.jsx
│       │   ├── ProjectTracker.jsx
│       │   ├── TrainingPanel.jsx
│       │   ├── WeeklyGrid.jsx
│       │   └── WeeklyReport.jsx
│       ├── contexts/AuthContext.jsx
│       ├── hooks/useModoCuidado.js
│       ├── pages/  (Home, Register, History, Login)
│       ├── services/api.js
│       └── utils/linguagem.js
└── backend/
    └── LeoDevTracker.API/
        ├── Controllers/
        │   ├── AuthController.cs
        │   ├── RegistrosController.cs   ← inclui exportar/pdf
        │   ├── AnaliseController.cs
        │   ├── FinanceiroController.cs
        │   ├── RotinaController.cs      ← slots + checkins + aderência
        │   ├── ProjetosController.cs
        │   ├── MetasController.cs
        │   └── LazeresController.cs
        ├── Services/
        │   ├── GeminiService.cs         ← IAiService
        │   └── AnaliseService.cs        ← prompts Leo + Rafa
        ├── Models/
        │   ├── RegistroDiario.cs
        │   ├── AnaliseSemanal.cs
        │   ├── Projeto.cs
        │   ├── MetaFinanceira.cs
        │   ├── RotinaSlot.cs            ← IsRecorrente, DiasRecorrentes
        │   ├── RotinaCheckin.cs
        │   └── Lazer.cs
        ├── Helpers/  (ExtrasHelper, UsuarioHelper)
        ├── Data/AppDbContext.cs
        ├── Migrations/
        ├── appsettings.json             ← GITIGNORED
        └── appsettings.example.json
```

## Variáveis de ambiente

### Backend (Render — Environment Variables)

| Variável                              | Descrição                             |
|---------------------------------------|---------------------------------------|
| `ConnectionStrings__DefaultConnection`| Connection string PostgreSQL          |
| `GeminiApi__ApiKey`                   | API key do Google AI Studio           |
| `Jwt__Secret`                         | Segredo JWT (mínimo 32 chars)         |
| `Jwt__Issuer`                         | `LeoDevTracker`                       |
| `Jwt__Audience`                       | `LeoDevTrackerApp`                    |
| `Usuarios__leo`                       | Hash BCrypt da senha do Leo           |
| `Usuarios__rafa`                      | Hash BCrypt da senha da Rafa          |
| `AllowedOrigins__0`                   | `https://dev-tracker-iota.vercel.app` |

### Frontend (Vercel)

| Variável       | Valor                                          |
|----------------|------------------------------------------------|
| `VITE_API_URL` | `https://leo-dev-tracker-api.onrender.com/api` |

## Autenticação

JWT com 30 dias de validade. Senhas armazenadas como BCrypt. Rate limiting de 10 tentativas/min por IP no endpoint de login. Falhas de autenticação logadas via `ILogger`.

## Segurança

- `appsettings.json` ignorado pelo Git (regra `backend/**/appsettings.json`) — nunca entrou no histórico
- Credenciais reais apenas nas env vars do Render
- CORS restrito às origens em `AllowedOrigins`
- Rate limiting: 60 req/min global; 10 req/min no login por IP
- Endpoints protegidos por `[Authorize]` (JWT Bearer); único endpoint público: `GET /health`

## Deploy

```bash
# Frontend — push para main dispara deploy automático no Vercel
git push origin main

# Backend — Render faz deploy automático via GitHub
# Para forçar: Render dashboard → Manual Deploy

# Antes do primeiro deploy após esta sessão: aplicar migration
dotnet ef database update
```

### Migration pendente para produção

`AddRecorrenteToRotinaSlot` — adiciona suporte a slots recorrentes:

```sql
ALTER TABLE rotina_slots ADD "DiasRecorrentes" integer[];
ALTER TABLE rotina_slots ADD "IsRecorrente" boolean NOT NULL DEFAULT FALSE;
```

## Observações de operação

- Render (free tier) hiberna após 15 min. Configure cron externo para `GET /health` a cada 10 min.
- Análise semanal: cooldown mínimo 7 dias; intervalo é dinâmico (começa na `SemanaFim` da última análise).
- Extrato bancário: PDF via PdfPig extrai texto — PDFs escaneados (imagem) não funcionam.
- Exportação PDF: `GET /api/registros/exportar/pdf` — exige token JWT, retorna últimos 7 dias.
- QuestPDF: licença community configurada em `Program.cs` (`LicenseType.Community`).

## Gerar hash BCrypt para nova senha

```bash
# .NET one-liner
dotnet script -e 'Console.WriteLine(BCrypt.Net.BCrypt.HashPassword("NOVA_SENHA"));'

# Ou via site: https://bcrypt-generator.com (rounds: 12)
```
