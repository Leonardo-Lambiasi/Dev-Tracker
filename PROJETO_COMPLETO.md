# Dev Tracker — Documentação Completa e Guia de Recriação

> **Como usar:** Cole este documento como contexto para o Claude Code e diga:
> "Recrie este projeto para [nome], adaptando o perfil, os campos e os prompts da IA conforme as instruções na seção de personalização."

---

## 1. VISÃO GERAL

App web pessoal de acompanhamento de desenvolvimento. O usuário registra o dia (estudos, trabalho, treino, humor) e a IA (Google Gemini) analisa os dados semanalmente. Há também painel financeiro com análise de extrato e exportação de histórico em PDF.

**Pilares:**
- Registro diário rápido (< 2 minutos), com seções colapsáveis e hints do preenchido
- Dashboard visual com gráficos, metas e rotina semanal
- Insight diário automático ao salvar + análise semanal com intervalo dinâmico
- Análise de extrato bancário via IA com schema estruturado

---

## 2. STACK E DEPENDÊNCIAS

```
Backend:  .NET 8 / ASP.NET Core / Entity Framework Core 8 / Npgsql
Banco:    PostgreSQL
IA:       Google Gemini via pacote Google.GenAI
PDF:      QuestPDF (geração) + UglyToad.PdfPig (extração de texto de PDF)
Frontend: React 18 / Vite 6 / React Router 6 / Recharts 2
Deploy:   Vercel (frontend) + Render (backend)
```

**Pacotes NuGet (backend):**
```xml
<PackageReference Include="AspNetCoreRateLimit" Version="5.0.0" />
<PackageReference Include="BCrypt.Net-Next" Version="4.0.3" />
<PackageReference Include="Google.GenAI" Version="1.6.2" />
<PackageReference Include="Microsoft.AspNetCore.Authentication.JwtBearer" Version="8.0.0" />
<PackageReference Include="Microsoft.AspNetCore.OpenApi" Version="8.0.23" />
<PackageReference Include="Microsoft.EntityFrameworkCore.Design" Version="8.0.11" />
<PackageReference Include="Npgsql.EntityFrameworkCore.PostgreSQL" Version="8.0.11" />
<PackageReference Include="QuestPDF" Version="2026.5.0" />
<PackageReference Include="Swashbuckle.AspNetCore" Version="6.6.2" />
<PackageReference Include="UglyToad.PdfPig" Version="1.7.0-custom-5" />
```

**Pacotes npm (frontend):**
```json
{
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.28.0",
    "recharts": "^2.13.3"
  }
}
```

---

## 3. ESTRUTURA DE PASTAS

```
leo-dev-tracker/
├── .gitignore                          ← inclui backend/**/appsettings.json
├── README.md
├── TELAS.md
├── LeoDevTracker.md
├── PERFIL_RAFA.md
├── PROJETO_COMPLETO.md
├── backend/
│   └── LeoDevTracker.API/
│       ├── Controllers/
│       │   ├── AuthController.cs
│       │   ├── RegistrosController.cs  ← inclui GET /exportar/pdf
│       │   ├── AnaliseController.cs
│       │   ├── FinanceiroController.cs ← inclui analisar-pdf
│       │   ├── RotinaController.cs     ← slots + checkins + aderência
│       │   ├── ProjetosController.cs
│       │   ├── MetasController.cs
│       │   └── LazeresController.cs
│       ├── Data/AppDbContext.cs
│       ├── Helpers/
│       │   ├── ExtrasHelper.cs         ← parse de DadosExtras JSON
│       │   └── UsuarioHelper.cs        ← GetUsuario(ClaimsPrincipal)
│       ├── Migrations/
│       ├── Models/
│       │   ├── AnaliseSemanal.cs
│       │   ├── Lazer.cs
│       │   ├── LoginRequest.cs
│       │   ├── MetaFinanceira.cs
│       │   ├── Projeto.cs
│       │   ├── RegistroDiario.cs
│       │   ├── RotinaCheckin.cs
│       │   └── RotinaSlot.cs           ← IsRecorrente, DiasRecorrentes
│       ├── Services/
│       │   ├── AiModelos.cs            ← constantes de modelos Gemini
│       │   ├── AnaliseService.cs       ← prompts Leo + Rafa
│       │   ├── GeminiService.cs        ← implementação IAiService
│       │   └── IAiService.cs           ← interface
│       ├── appsettings.json            ← GITIGNORED
│       ├── appsettings.example.json    ← template sem valores reais
│       └── Program.cs
└── frontend/
    ├── index.html
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── App.jsx
        ├── index.css
        ├── main.jsx
        ├── components/
        │   ├── DailyForm.jsx
        │   ├── Dashboard.jsx
        │   ├── ExtratoPanel.jsx
        │   ├── FinancePanel.jsx
        │   ├── FocoProjetos.jsx
        │   ├── ProjectTracker.jsx
        │   ├── TrainingPanel.jsx
        │   ├── WeeklyGrid.jsx          ← slots recorrentes
        │   └── WeeklyReport.jsx
        ├── contexts/AuthContext.jsx
        ├── hooks/useModoCuidado.js
        ├── pages/
        │   ├── History.jsx             ← botão exportar PDF
        │   ├── Home.jsx
        │   ├── Login.jsx
        │   └── Register.jsx
        ├── services/api.js
        └── utils/linguagem.js
```

---

## 4. BANCO DE DADOS

Tabelas criadas via EF Core migrations. Nunca precisa rodar SQL manualmente.

### Tabelas principais

```sql
-- Registros diários
CREATE TABLE registros_diarios (
    "Id"               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "Data"             TIMESTAMPTZ NOT NULL,
    "HorasEstudo"      DECIMAL(4,2),
    "TopicoEstudo"     VARCHAR(200),
    "FeaturesRift"     INTEGER NOT NULL DEFAULT 0,
    "BugsRift"         INTEGER NOT NULL DEFAULT 0,
    "TicketsTrabalhados" INTEGER,
    "HorasTrabalhadas" DECIMAL(4,2),
    "Humor"            SMALLINT CHECK ("Humor" BETWEEN 1 AND 5),
    "Conquistas"       TEXT,
    "Desafios"         TEXT,
    "Destaque"         TEXT,
    "TreinoTipo"       VARCHAR(50),
    "TreinoRendimento" SMALLINT CHECK ("TreinoRendimento" BETWEEN 1 AND 5),
    "TreinoObs"        TEXT,
    "InsightDiario"    TEXT,
    "DadosExtras"      TEXT,            -- JSON com campos extras por usuário
    "Usuario"          VARCHAR(100) NOT NULL DEFAULT 'leo',
    "CriadoEm"         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Análises semanais (desenvolvimento e financeiro)
CREATE TABLE analises_semanais (
    "Id"           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "SemanaInicio" TIMESTAMPTZ NOT NULL,
    "SemanaFim"    TIMESTAMPTZ NOT NULL,
    "Conteudo"     TEXT,
    "Tipo"         VARCHAR(30) NOT NULL DEFAULT 'desenvolvimento',
    "Usuario"      VARCHAR(100) NOT NULL DEFAULT 'leo',
    "CriadoEm"     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Projetos pessoais
CREATE TABLE projetos (
    "Id"          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "Nome"        VARCHAR(100) NOT NULL,
    "Descricao"   TEXT,
    "Stack"       VARCHAR(200),
    "Percentual"  INTEGER NOT NULL DEFAULT 0,
    "Status"      VARCHAR(50),
    "ProximoPasso" VARCHAR(200),
    "Usuario"     VARCHAR(100) NOT NULL DEFAULT 'leo',
    "AtualizadoEm" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Metas financeiras
CREATE TABLE metas_financeiras (
    "Id"          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "Descricao"   VARCHAR(200),
    "ValorMeta"   DECIMAL(10,2) NOT NULL,
    "ValorAtual"  DECIMAL(10,2) NOT NULL DEFAULT 0,
    "Prazo"       TIMESTAMPTZ,
    "Usuario"     VARCHAR(100) NOT NULL DEFAULT 'leo',
    "AtualizadoEm" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Slots de rotina semanal
CREATE TABLE rotina_slots (
    "Id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "Usuario"         VARCHAR(100) NOT NULL,
    "DiaSemana"       INTEGER NOT NULL,  -- 0=Dom, 1=Seg ... 6=Sáb
    "Periodo"         VARCHAR(20) NOT NULL,  -- 'manha','tarde','noite'
    "Label"           VARCHAR(100) NOT NULL,
    "Categoria"       VARCHAR(50) NOT NULL,
    "HoraInicio"      VARCHAR(5),
    "HoraFim"         VARCHAR(5),
    "IsRecorrente"    BOOLEAN NOT NULL DEFAULT FALSE,
    "DiasRecorrentes" INTEGER[],         -- dias em que aparece (0–6)
    "CriadoEm"        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Checkins de aderência à rotina
CREATE TABLE rotina_checkins (
    "Id"      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "SlotId"  UUID NOT NULL,
    "Usuario" VARCHAR(100) NOT NULL,
    "Semana"  TIMESTAMPTZ NOT NULL,      -- segunda-feira da semana (date)
    "Status"  VARCHAR(20) NOT NULL,      -- 'feito' ou 'nao_feito'
    "CriadoEm" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE ("SlotId", "Usuario", "Semana")
);

-- Lazeres personalizados (Rafa)
CREATE TABLE lazeres (
    "Id"      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "Usuario" VARCHAR(100) NOT NULL DEFAULT 'rafa',
    "Nome"    VARCHAR(100) NOT NULL,
    "CriadoEm" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE ("Usuario", "Nome")
);
```

### DadosExtras (JSON no RegistroDiario — campos Rafa)

```json
{
  "qualidadeSono": 4,
  "gratidao": "Texto da gratidão",
  "atendimentos": 5,
  "conteudoPostado": 1,
  "cancelamentos": 0,
  "motivoCancelamento": null,
  "lazer": "Crochê",
  "lazerIntensidade": 3,
  "lazerObs": null
}
```

---

## 5. BACKEND — CONFIGURAÇÃO

### appsettings.json (estrutura — não commitar com valores reais)

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=SEU_HOST;Database=SEU_DB;Username=SEU_USER;Password=SUA_SENHA;Ssl Mode=Require"
  },
  "Logging": { "LogLevel": { "Default": "Information", "Microsoft.AspNetCore": "Warning" } },
  "AllowedHosts": "*",
  "AllowedOrigins": ["http://localhost:5173", "https://seu-frontend.vercel.app"],
  "GeminiApi": { "ApiKey": "AIza..." },
  "Jwt": {
    "Secret": "CHAVE_SECRETA_MINIMO_32_CARACTERES",
    "Issuer": "LeoDevTracker",
    "Audience": "LeoDevTrackerApp",
    "ExpiracaoHoras": "720"
  },
  "Usuarios": {
    "leo": "$2b$12$HASH_BCRYPT_DO_LEO",
    "rafa": "$2b$12$HASH_BCRYPT_DA_RAFA"
  },
  "IpRateLimiting": {
    "EnableEndpointRateLimiting": true,
    "StackBlockedRequests": false,
    "RealIpHeader": "X-Real-IP",
    "ClientIdHeader": "X-ClientId",
    "HttpStatusCode": 429,
    "QuotaExceededMessage": "Muitas requisições. Tente novamente em instantes.",
    "GeneralRules": [
      { "Endpoint": "*", "Period": "1m", "Limit": 60 },
      { "Endpoint": "POST:/api/auth/login", "Period": "1m", "Limit": 10 }
    ]
  }
}
```

### Program.cs (estrutura)

```csharp
using QuestPDF.Infrastructure;
QuestPDF.Settings.License = LicenseType.Community;

// serviços: DbContext, GeminiService (IAiService), AnaliseService
// JWT Bearer com validação de issuer/audience/signing key
// AspNetCoreRateLimit: AddMemoryCache + AddInMemoryRateLimiting
// CORS: WithOrigins(AllowedOrigins do config)

// middleware order: UseIpRateLimiting → UseCors → UseAuthentication → UseAuthorization
// GET /health público retorna { status: "ok", ts: DateTime.UtcNow }
// Em produção: db.Database.Migrate() automático na startup
```

---

## 6. BACKEND — SERVIÇOS

### IAiService / GeminiService

```csharp
public interface IAiService
{
    Task<string> Enviar(string prompt, string modelo, int maxTokens = 1024,
                        bool jsonMode = false, int thinkingBudget = -1);
}
```

`GeminiService` implementa via `Google.GenAI.Client`. ThinkingBudget padrão: 0 para Flash, 8000 para Pro. Para jsonMode, seta `ResponseMimeType = "application/json"`.

Modelos usados:
- Insights diários: `gemini-2.5-flash` (ThinkingBudget=0, maxTokens=500)
- Análise semanal: `gemini-2.5-flash` (ThinkingBudget=2048, maxTokens=1200)
- Extrato bancário: `gemini-2.5-flash` (jsonMode=true, maxTokens=2000)

### AnaliseService

Responsável pelos prompts da análise semanal. Método principal: `GerarAnaliseSemanal(string usuario)`.

**Intervalo dinâmico:**
```csharp
var ultimaAnalise = await _db.AnalisesSemanais
    .Where(a => a.Usuario == usuario && a.Tipo == "desenvolvimento")
    .OrderByDescending(a => a.CriadoEm).FirstOrDefaultAsync();

var fim = DateTime.UtcNow;
var inicio = ultimaAnalise != null && (fim - ultimaAnalise.SemanaFim).TotalHours >= 12
    ? ultimaAnalise.SemanaFim
    : fim.AddDays(-7);
```

---

## 7. BACKEND — CONTROLLERS

### AuthController

- `POST /api/auth/login` — verifica BCrypt, emite JWT (30 dias)
- Falha: `ILogger.LogWarning("Login falhou para usuário '{Username}' — IP: {Ip} — {Timestamp}", ...)`
- IP resolvido via `X-Forwarded-For` → `X-Real-IP` → `RemoteIpAddress`

### RegistrosController

- CRUD padrão + `/semana` + `/resumo`
- `POST /api/registros`: salva registro → busca últimos 5 + projetos (Leo) + streak 30 dias (Leo) → gera insight via IA
- `GET /api/registros/exportar/pdf`: últimos 7 dias → QuestPDF com cards por dia. Retorna `File(bytes, "application/pdf", "devtracker-historico-DD-MM-YYYY.pdf")`
- Streak: calcula dias consecutivos de treino olhando nos últimos 30 registros
- CheckAlertaHumor: média dos 2 registros anteriores + hoje ≤ 2 → flag para prompt Rafa

### RotinaController

- `GET /api/rotina`: retorna slots reais + cópias virtuais dos recorrentes (injetadas onde não há slot manual no mesmo dia/período)
- DTO `RotinaSlotDto` inclui `isVirtual`, `recorrenteOriginalId`, `isRecorrente`, `diasRecorrentes`
- POST/PUT aceitam `IsRecorrente` e `DiasRecorrentes`

### FinanceiroController

- Aceita extrato em texto (`POST /analisar-extrato`) ou PDF (`POST /analisar-pdf`, max 10MB)
- Carrega metas financeiras do usuário e inclui no prompt
- Schema JSON retornado: `resumo` (string), `categorias`, `maiores_gastos`, `padrao`, `recomendacao`, `projecao`, `acoes_concretas`, `alertas`, `metas_impacto`

---

## 8. FRONTEND — COMPONENTES CHAVE

### WeeklyGrid

Slots recorrentes: visual com borda tracejada + ↻. Ao editar slot virtual: diálogo "só este dia" vs. "todos os recorrentes". Slots recorrentes em edição mostram banner explicativo. Toggle "Repetir toda semana" + checkboxes de dias no form.

### ExtratoPanel

Detecta novo schema por `typeof dados.resumo === 'string'`. Renderiza projeção, ações concretas, alertas e impacto nas metas. Mantém retrocompatibilidade com análises antigas (campo `dicas`).

### WeeklyReport

Cooldown: 7 dias desde última análise (`diasDesdeUltima() >= 7`). Intervalo dinâmico no backend.

### DailyForm

Campos numéricos com limites explícitos: `atendimentos` max=20, `cancelamentos` max=10, `conteudoPostado` max=10, `ticketsTrabalhados` max=50. `horas*` max=24.

---

## 9. FRONTEND — api.js (destaques)

```js
// Login lê o body real do erro (JSON ou texto plano para 429)
login: async (usuario, senha) => {
    const r = await fetch(`${BASE}/auth/login`, { ... });
    if (!r.ok) {
        let msg = `HTTP ${r.status}`;
        try {
            const text = await r.text();
            try { const b = JSON.parse(text); if (b?.error) msg = b.error; }
            catch { if (text?.trim()) msg = text.trim(); }
        } catch {}
        throw new Error(msg);
    }
    return r.json();
},

// PDF: baixa como blob, não abre nova aba
exportarPdf: async () => {
    const r = await fetch(`${BASE}/registros/exportar/pdf`, { headers: { Authorization } });
    const blob = await r.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `devtracker-historico-${dd}-${mm}-${yyyy}.pdf`;
    a.click();
    URL.revokeObjectURL(a.href);
},
```

---

## 10. CSS — ANIMAÇÕES

```css
@keyframes pulse {
  0%, 100% { opacity: 0.4; }
  50%       { opacity: 0.7; }
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}
.chart-appear { animation: fadeIn 0.35s ease both; }
```

Gráficos usam `.chart-appear` com `animationDelay` escalonado de 50ms. Skeletons de loading usam `animation: 'pulse 1.5s infinite'` (CSS declarado acima, estava faltando).

---

## 11. SEGURANÇA

- `appsettings.json` em `.gitignore` — nunca entrou no histórico Git (verificado via `git log --all --full-history`)
- Rate limit: AspNetCoreRateLimit, por IP, 10/min no login
- JWT: HS256, 30 dias, issuer + audience validados
- CORS: origens explícitas no config (não `*`)
- BCrypt: custo 12 nos hashes de senha
- Log de falha de auth: usuário + IP + timestamp; senha nunca logada
- Todos os endpoints protegidos por `[Authorize]` exceto `/api/auth/login` e `/health`
- X-Forwarded-For aceito para logging (ambiente com proxy); rate limiting usa header configurado separadamente

---

## 12. SETUP — PASSO A PASSO

### Backend

```bash
cd backend/LeoDevTracker.API

# Copiar template de config
cp appsettings.example.json appsettings.json
# Editar appsettings.json com valores reais

# Restaurar pacotes e aplicar migrations
dotnet restore
dotnet ef database update

# Rodar
dotnet run
# Swagger: http://localhost:5000/swagger (desenvolvimento)
```

### Frontend

```bash
cd frontend
npm install
npm run dev
# http://localhost:5173
```

### .gitignore (raiz)

```gitignore
backend/**/bin/
backend/**/obj/
backend/**/appsettings.json
backend/**/appsettings.Development.json
backend/**/appsettings.Local.json
backend/**/appsettings.Production.json
backend/**/logs/
frontend/node_modules/
frontend/dist/
frontend/.env
frontend/.env.local
.vscode/
.idea/
.DS_Store
.claude/
```

---

## 13. ENDPOINTS COMPLETOS

```
# Auth (público)
POST   /api/auth/login                → JWT
GET    /health                         → { status, ts }

# Registros (requerem token)
POST   /api/registros                  → cria + gera insight IA
GET    /api/registros                  → lista (filtro ?inicio=&fim=)
GET    /api/registros/{id}
GET    /api/registros/semana           → últimos 7 dias
GET    /api/registros/resumo           → métricas agregadas
GET    /api/registros/exportar/pdf     → PDF dos últimos 7 dias
PUT    /api/registros/{id}
DELETE /api/registros/{id}

# Projetos
GET/POST/PUT/DELETE /api/projetos[/{id}]

# Metas financeiras
GET/POST/PUT/DELETE /api/metas[/{id}]

# Análise semanal
POST   /api/analise/gerar              → gera (intervalo dinâmico)
GET    /api/analise/ultima             → última análise de desenvolvimento
GET    /api/analise/historico          → todas (?tipo=financeiro|desenvolvimento)

# Financeiro
POST   /api/financeiro/analisar-extrato
POST   /api/financeiro/analisar-pdf    → max 10MB

# Rotina
GET    /api/rotina                     → slots + virtuais de recorrentes
POST   /api/rotina                     → cria (isRecorrente, diasRecorrentes)
PUT    /api/rotina/{id}
DELETE /api/rotina/{id}
GET    /api/rotina/checkins?semana=    → checkins da semana
PUT    /api/rotina/{slotId}/checkin    → upsert checkin
GET    /api/rotina/aderencia?semanas=  → aderência das últimas N semanas

# Lazeres
GET/POST/PUT/DELETE /api/lazeres[/{id}]
```

---

## 14. ESTADO ATUAL DO PROJETO (junho/2026)

| Funcionalidade | Status |
|---|---|
| Registro diário com seções colapsáveis | ✅ |
| Insight diário via IA (Gemini Flash) | ✅ |
| Modo cuidado Rafa (humor ≤ 2) | ✅ |
| Dashboard Leo: cards + gráficos | ✅ |
| Dashboard Rafa: bem-estar + lazer + aderência | ✅ |
| CRUD de projetos com barra e próximo passo | ✅ |
| CRUD de metas financeiras | ✅ |
| Análise semanal com intervalo dinâmico | ✅ |
| Análise semanal estruturada em 4 seções | ✅ |
| Análise de extrato (texto + PDF) | ✅ |
| Extrato: novo schema (projeção, ações, alertas, metas_impacto) | ✅ |
| Rotina semanal 7×3 com checkins | ✅ |
| Slots recorrentes (visual diferenciado, editar só este/todos) | ✅ |
| Exportação PDF dos últimos 7 dias | ✅ |
| Histórico com exclusão inline | ✅ |
| Rate limiting no login (10/min por IP) | ✅ |
| Log de falhas de auth via ILogger | ✅ |
| JWT + BCrypt | ✅ |
| Animações de entrada nos gráficos | ✅ |
| Deploy (Vercel + Render) | ✅ |
| Notificações por email | ⏳ Futuro |
| Import de commits do GitHub | ⏳ Futuro |

---

## 15. PERSONALIZAÇÃO — CHECKLIST PARA NOVA INSTÂNCIA

### Backend
- [ ] `AnaliseService.cs` → `MontarPromptLeo` ou criar `MontarPromptNomeUsuario` com novo perfil
- [ ] `RegistrosController.cs` → `MontarPromptInsightLeo` com novo perfil
- [ ] `FinanceiroController.cs` → contexto no prompt (`"Nome, X anos, [contexto]"`)
- [ ] Campos de `RegistroDiario.cs` — adicionar/remover campos específicos
- [ ] `GetResumo` — recalcular para novos campos
- [ ] `appsettings.json` → novo usuário em `Usuarios`, novo BCrypt hash
- [ ] `GerarPdf` em `RegistrosController.cs` → campos condicionais por usuário

### Frontend
- [ ] `App.jsx` → nome do app na navbar
- [ ] `DailyForm.jsx` → seções e campos específicos
- [ ] `Dashboard.jsx` → cards de resumo, gráficos e métricas
- [ ] `TrainingPanel.jsx` → tipos de treino e metas
- [ ] `api.js` → `VITE_API_URL` em produção

### Exemplos de perfis

**Estudante:**
- Trocar Rift por horas de aula, exercícios feitos, matéria
- Prompt: "estudante de [curso], meta: [concurso/vestibular]"

**Profissional de saúde / clínica:**
- Adicionar pacientes atendidos, supervisão, conteúdo postado
- Prompt: "psicóloga/nutricionista/médica, meta: equilibrar clínica e bem-estar"

**Empreendedor:**
- Adicionar vendas do dia, leads gerados, MRR
- Prompt: "empreendedor, meta: escalar o negócio"

---

## 16. OBSERVAÇÕES TÉCNICAS

1. **Datas:** usar `new Date(data + 'T12:00:00').toISOString()` no frontend (meio-dia local) para evitar bug de fuso à noite. Nunca usar `.toISOString().slice(0,10)` para data local.

2. **Botões em formulários:** todo `<button>` dentro de `<form>` deve ter `type="button"` para não disparar submit.

3. **EF Core + PostgreSQL:** migrations criam o banco automaticamente. `db.Database.Migrate()` na startup em produção.

4. **QuestPDF:** `LicenseType.Community` deve ser setado antes de qualquer `Document.Create()`. Feito em `Program.cs` antes do builder.

5. **AspNetCoreRateLimit:** `EnableEndpointRateLimiting: true` necessário para regras por endpoint; sem isso só regras globais funcionam.

6. **Gemini ThinkingBudget:** `0` = resposta direta sem reasoning (Flash para insights rápidos); `2048` = raciocínio moderado (análise semanal); `8000` = raciocínio extenso (reservado para análises longas).

7. **PDF via curl:** `curl -sI` envia HEAD — usar `-D - -o /dev/null` para ver headers de uma requisição GET.

8. **Slots recorrentes:** cópias virtuais têm ID efêmero (`Guid.NewGuid()` a cada GET). Checkins usam `recorrenteOriginalId`. Exclusão de slot virtual não é possível diretamente — o usuário deve "editar só este" para criar override, ou "editar todos" para remover o dia da recorrência.

9. **Login + 429:** `api.login` lê o body do erro antes de jogar exceção. Login.jsx exibe a mensagem real (não hardcoded). Garante que mensagem de rate limit chegue ao usuário.

10. **appsettings.json:** nunca commitado (`.gitignore` linha 10: `backend/**/appsettings.json`). Verificado via `git check-ignore -v` — nunca entrou no histórico.
