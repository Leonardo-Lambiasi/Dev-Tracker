# Dev Tracker

> App fullstack de acompanhamento pessoal de produtividade, treino, humor e finanças, com insights automáticos via IA. Em produção, uso ativo diário por duas pessoas.

**Deploy:** [dev-tracker-iota.vercel.app](https://dev-tracker-iota.vercel.app)

---

## Sobre o Projeto

Sistema de registro diário (estudo, trabalho, treino, humor, reflexão) com análise automática via IA a cada entrada e relatório semanal estruturado. Inclui painel financeiro com leitura de extrato bancário (texto ou PDF) via IA, metas com progresso, grade de rotina semanal com suporte a recorrência, e exportação de histórico em PDF.

Projetado para dois perfis de uso diferentes — cada um com campos, métricas e tom de IA adaptados ao contexto da pessoa (ex: um "modo cuidado" que muda o comportamento do dashboard e da IA quando o humor médio recente cai abaixo de um limite).

---

## 🛠️ Tech Stack

| Camada    | Tecnologia                                     |
|-----------|-------------------------------------------------|
| Backend   | C# · .NET 8 · ASP.NET Core · Entity Framework Core 8 |
| Frontend  | React 18 · Vite 6 · React Router 6 · Recharts 2 |
| Banco     | PostgreSQL (Neon)                                |
| IA        | Google Gemini 2.5 Flash                          |
| PDF       | QuestPDF (geração) · PdfPig (extração)          |
| Deploy    | Vercel (frontend) · Render (backend)            |

---

## Destaques Técnicos

**Personalização multiusuário via configuração, não código duplicado.** Campos do formulário, métricas do dashboard e prompts de IA são adaptados por perfil de usuário através de configuração central, não branches condicionais espalhadas pelo código.

**Análise semanal com janela dinâmica.** O intervalo de análise começa a partir do fim do período já analisado (não uma janela fixa), com cooldown mínimo de 7 dias — evita reprocessamento e mantém o histórico de insights coerente.

**Segurança aplicada, não só declarada:** rate limiting por IP (10 tentativas/min no login, 60 req/min global), log estruturado de falhas de autenticação (usuário + IP + timestamp), senhas em BCrypt, JWT com expiração configurável, e `appsettings.json` fora do controle de versão desde o primeiro commit — nunca esteve no histórico do repositório.

**Extração de extrato bancário via IA** — leitura de PDF ou texto colado, retornando categorização de gastos, maiores despesas, projeção e alertas cruzados com metas financeiras ativas.

---

## Funcionalidades

- Registro diário rápido com insight de IA gerado automaticamente ao salvar
- Análise semanal estruturada (Visão Geral / Destaques / Padrões / Foco do período)
- Análise de extrato bancário (texto ou PDF) via IA
- Metas financeiras com aporte rápido e barra de progresso
- Rotina semanal em grade, com suporte a slots recorrentes
- Exportação de histórico em PDF
- Rate limiting e logging de tentativas de login

---

## Estrutura

```
leo-dev-tracker/
├── frontend/
│   └── src/
│       ├── components/
│       ├── contexts/AuthContext.jsx
│       ├── hooks/useModoCuidado.js
│       ├── pages/
│       ├── services/api.js
│       └── utils/
└── backend/
    └── LeoDevTracker.API/
        ├── Controllers/
        ├── Services/        ← GeminiService, AnaliseService
        ├── Models/
        ├── Data/AppDbContext.cs
        └── Migrations/
```

---

## Rodando localmente

```bash
# Backend
cd backend/LeoDevTracker.API
cp appsettings.example.json appsettings.json   # preencher com suas credenciais
dotnet ef database update
dotnet run

# Frontend
cd frontend
cp .env.example .env
npm install
npm run dev
```

## Segurança

- `appsettings.json` está no `.gitignore` desde o commit inicial — nunca esteve no histórico do repositório
- Credenciais de produção vivem apenas nas variáveis de ambiente do Render/Vercel
- CORS restrito às origens configuradas
- Endpoints protegidos por JWT Bearer (`[Authorize]`); único endpoint público é `GET /health`

---

*Projeto pessoal em uso contínuo desde maio/2026.*
