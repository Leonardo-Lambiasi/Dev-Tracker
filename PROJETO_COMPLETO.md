# Dev Tracker — Documentação Completa e Prompt de Recriação

> **Como usar este documento:** Cole-o inteiro como contexto para o Claude Code e diga:
> "Recrie este projeto para [nome], adaptando o perfil, os campos e os prompts da IA conforme as instruções no final do documento."

---

## 1. VISÃO GERAL

App web pessoal de acompanhamento de desenvolvimento. O usuário registra o que fez no dia (estudos, trabalho, treino, humor) e a IA (Claude API) analisa os dados semanalmente, gerando um relatório com insights reais sobre progresso e padrões. Há também um painel financeiro com análise de extrato bancário via IA.

**Quatro pilares:**
- Registro diário rápido (< 2 minutos), com seções colapsáveis
- Dashboard visual com gráficos e metas
- Análise semanal automatizada via Claude Sonnet 4.6
- Análise de extrato bancário via Claude Haiku 4.5

---

## 2. STACK E DEPENDÊNCIAS

```
Backend:  .NET 8 / ASP.NET Core / Entity Framework Core 8 / Npgsql
Banco:    PostgreSQL
Frontend: React 18 / Vite 6 / React Router 6 / Recharts 2
IA:       Claude API (Anthropic) — Sonnet 4.6 + Haiku 4.5
Deploy:   Vercel (frontend) + Railway ou Render (backend)
```

**Pacotes NuGet (backend):**
```xml
<PackageReference Include="Microsoft.AspNetCore.OpenApi" Version="8.0.23" />
<PackageReference Include="Microsoft.EntityFrameworkCore.Design" Version="8.0.11" />
<PackageReference Include="Npgsql.EntityFrameworkCore.PostgreSQL" Version="8.0.11" />
<PackageReference Include="Swashbuckle.AspNetCore" Version="6.6.2" />
```

**Pacotes npm (frontend):**
```json
{
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.28.0",
    "recharts": "^2.13.3"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.4",
    "vite": "^6.0.5"
  }
}
```

---

## 3. ESTRUTURA DE PASTAS

```
projeto/
├── .gitignore
├── backend/
│   └── NomeDoApp.API/
│       ├── Controllers/
│       │   ├── RegistrosController.cs
│       │   ├── ProjetosController.cs
│       │   ├── MetasController.cs
│       │   ├── AnaliseController.cs
│       │   └── FinanceiroController.cs
│       ├── Data/
│       │   └── AppDbContext.cs
│       ├── Models/
│       │   ├── RegistroDiario.cs
│       │   ├── Projeto.cs
│       │   ├── MetaFinanceira.cs
│       │   └── AnaliseSemanal.cs
│       ├── Services/
│       │   ├── ClaudeService.cs
│       │   └── AnaliseService.cs
│       ├── appsettings.json          ← gitignored (tem senha e API key)
│       ├── appsettings.example.json  ← commitado como template
│       └── Program.cs
└── frontend/
    ├── index.html
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── App.jsx
        ├── main.jsx
        ├── index.css
        ├── services/
        │   └── api.js
        ├── components/
        │   ├── DailyForm.jsx
        │   ├── Dashboard.jsx
        │   ├── WeeklyReport.jsx
        │   ├── ProjectTracker.jsx
        │   ├── FinancePanel.jsx
        │   ├── TrainingPanel.jsx
        │   └── ExtratoPanel.jsx
        └── pages/
            ├── Home.jsx
            ├── Register.jsx
            └── History.jsx
```

---

## 4. BANCO DE DADOS — SQL

```sql
CREATE TABLE registros_diarios (
    "Id"               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "Data"             TIMESTAMPTZ NOT NULL,
    "HorasEstudo"        DECIMAL(4,2),
    "TopicoEstudo"       VARCHAR(200),
    "TicketsTrabalhados" INTEGER,
    "HorasTrabalhadas"   DECIMAL(4,2),
    "Humor"              SMALLINT CHECK ("Humor" BETWEEN 1 AND 5),
    "Conquistas"         TEXT,
    "Desafios"           TEXT,
    "Destaque"           TEXT,
    "TreinoTipo"       VARCHAR(50),   -- 'academia', 'volei', 'ambos', 'nenhum'
    "TreinoRendimento" SMALLINT CHECK ("TreinoRendimento" BETWEEN 1 AND 5),
    "TreinoObs"        TEXT,
    "CriadoEm"         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE projetos (
    "Id"          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "Nome"        VARCHAR(100) NOT NULL,
    "Descricao"   TEXT,
    "Stack"       VARCHAR(200),
    "Percentual"  INTEGER NOT NULL DEFAULT 0,
    "Status"      VARCHAR(50),   -- 'em andamento', 'pausado', 'concluído'
    "AtualizadoEm" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE metas_financeiras (
    "Id"          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "Descricao"   VARCHAR(200),
    "ValorMeta"   DECIMAL(10,2) NOT NULL,
    "ValorAtual"  DECIMAL(10,2) NOT NULL DEFAULT 0,
    "Prazo"       TIMESTAMPTZ,
    "AtualizadoEm" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE analises_semanais (
    "Id"           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "SemanaInicio" TIMESTAMPTZ NOT NULL,
    "SemanaFim"    TIMESTAMPTZ NOT NULL,
    "Conteudo"     TEXT,
    "CriadoEm"    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

> As tabelas são criadas automaticamente via `dotnet ef migrations add InitialCreate` + `dotnet ef database update`. Não precisa rodar o SQL manualmente.

---

## 5. BACKEND — MODELOS

### Models/RegistroDiario.cs
```csharp
using System.ComponentModel.DataAnnotations;

namespace NomeDoApp.API.Models
{
    public class RegistroDiario
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        public DateTime Data { get; set; }

        public decimal? HorasEstudo { get; set; }

        [StringLength(200)]
        public string? TopicoEstudo { get; set; }

        public int? TicketsTrabalhados { get; set; }
        public decimal? HorasTrabalhadas { get; set; }

        [Range(1, 5)]
        public int? Humor { get; set; }

        public string? Conquistas { get; set; }
        public string? Desafios { get; set; }
        public string? Destaque { get; set; }

        [StringLength(50)]
        public string? TreinoTipo { get; set; }

        [Range(1, 5)]
        public int? TreinoRendimento { get; set; }

        public string? TreinoObs { get; set; }

        public DateTime CriadoEm { get; set; } = DateTime.UtcNow;
    }
}
```

### Models/Projeto.cs
```csharp
using System.ComponentModel.DataAnnotations;

namespace NomeDoApp.API.Models
{
    public class Projeto
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        [StringLength(100)]
        public string Nome { get; set; } = string.Empty;

        public string? Descricao { get; set; }

        [StringLength(200)]
        public string? Stack { get; set; }

        [Range(0, 100)]
        public int Percentual { get; set; } = 0;

        [StringLength(50)]
        public string? Status { get; set; }

        public DateTime AtualizadoEm { get; set; } = DateTime.UtcNow;
    }
}
```

### Models/MetaFinanceira.cs
```csharp
using System.ComponentModel.DataAnnotations;

namespace NomeDoApp.API.Models
{
    public class MetaFinanceira
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        [StringLength(200)]
        public string? Descricao { get; set; }

        [Range(0, double.MaxValue)]
        public decimal ValorMeta { get; set; }

        public decimal ValorAtual { get; set; } = 0;

        public DateTime? Prazo { get; set; }

        public DateTime AtualizadoEm { get; set; } = DateTime.UtcNow;
    }
}
```

### Models/AnaliseSemanal.cs
```csharp
using System.ComponentModel.DataAnnotations;

namespace NomeDoApp.API.Models
{
    public class AnaliseSemanal
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        public DateTime SemanaInicio { get; set; }

        [Required]
        public DateTime SemanaFim { get; set; }

        public string? Conteudo { get; set; }

        public DateTime CriadoEm { get; set; } = DateTime.UtcNow;
    }
}
```

---

## 6. BACKEND — INFRAESTRUTURA

### Data/AppDbContext.cs
```csharp
using NomeDoApp.API.Models;
using Microsoft.EntityFrameworkCore;

namespace NomeDoApp.API.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        public DbSet<RegistroDiario> RegistrosDiarios => Set<RegistroDiario>();
        public DbSet<Projeto> Projetos => Set<Projeto>();
        public DbSet<MetaFinanceira> MetasFinanceiras => Set<MetaFinanceira>();
        public DbSet<AnaliseSemanal> AnalisesSemanais => Set<AnaliseSemanal>();

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<RegistroDiario>(e =>
            {
                e.ToTable("registros_diarios");
                e.Property(r => r.CriadoEm).HasDefaultValueSql("NOW()");
            });
            modelBuilder.Entity<Projeto>(e =>
            {
                e.ToTable("projetos");
                e.Property(p => p.AtualizadoEm).HasDefaultValueSql("NOW()");
            });
            modelBuilder.Entity<MetaFinanceira>(e =>
            {
                e.ToTable("metas_financeiras");
                e.Property(m => m.AtualizadoEm).HasDefaultValueSql("NOW()");
            });
            modelBuilder.Entity<AnaliseSemanal>(e =>
            {
                e.ToTable("analises_semanais");
                e.Property(a => a.CriadoEm).HasDefaultValueSql("NOW()");
            });
        }
    }
}
```

### Program.cs
```csharp
using NomeDoApp.API.Data;
using NomeDoApp.API.Services;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddHttpClient<ClaudeService>();
builder.Services.AddScoped<AnaliseService>();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy
            .WithOrigins("http://localhost:5173")
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowFrontend");
app.UseAuthorization();
app.MapControllers();

app.Run();
```

### appsettings.json (estrutura — não commitar com valores reais)
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Database=NOME_DO_BANCO;Username=postgres;Password=SUA_SENHA"
  },
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning"
    }
  },
  "AllowedHosts": "*",
  "ClaudeApi": {
    "ApiKey": "sk-ant-..."
  }
}
```

---

## 7. BACKEND — CONTROLLERS

### Controllers/RegistrosController.cs
```csharp
using NomeDoApp.API.Data;
using NomeDoApp.API.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace NomeDoApp.API.Controllers
{
    [ApiController]
    [Route("api/registros")]
    public class RegistrosController : ControllerBase
    {
        private readonly AppDbContext _db;
        public RegistrosController(AppDbContext db) => _db = db;

        [HttpPost]
        public async Task<IActionResult> Create(RegistroDiario registro)
        {
            registro.Id = Guid.NewGuid();
            registro.CriadoEm = DateTime.UtcNow;
            _db.RegistrosDiarios.Add(registro);
            await _db.SaveChangesAsync();
            return CreatedAtAction(nameof(GetById), new { id = registro.Id }, registro);
        }

        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] DateTime? inicio, [FromQuery] DateTime? fim)
        {
            var query = _db.RegistrosDiarios.AsQueryable();
            if (inicio.HasValue) query = query.Where(r => r.Data >= inicio.Value);
            if (fim.HasValue)   query = query.Where(r => r.Data <= fim.Value);
            return Ok(await query.OrderByDescending(r => r.Data).ToListAsync());
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            var registro = await _db.RegistrosDiarios.FindAsync(id);
            return registro == null ? NotFound() : Ok(registro);
        }

        [HttpGet("semana")]
        public async Task<IActionResult> GetSemana()
        {
            var inicio = DateTime.UtcNow.AddDays(-7).Date;
            return Ok(await _db.RegistrosDiarios
                .Where(r => r.Data >= inicio)
                .OrderByDescending(r => r.Data)
                .ToListAsync());
        }

        [HttpGet("resumo")]
        public async Task<IActionResult> GetResumo([FromQuery] DateTime? inicio, [FromQuery] DateTime? fim)
        {
            var dataInicio = inicio ?? DateTime.UtcNow.AddDays(-7).Date;
            var dataFim    = fim   ?? DateTime.UtcNow.Date;

            var registros = await _db.RegistrosDiarios
                .Where(r => r.Data >= dataInicio && r.Data <= dataFim)
                .ToListAsync();

            return Ok(new
            {
                TotalHorasEstudo      = registros.Sum(r => r.HorasEstudo ?? 0),
                TotalTicketsRift      = registros.Sum(r => r.TicketsTrabalhados ?? 0),
                TotalHorasTrabalhadas = registros.Sum(r => r.HorasTrabalhadas ?? 0),
                HumorMedio            = registros.Any(r => r.Humor.HasValue)
                    ? registros.Where(r => r.Humor.HasValue).Average(r => (double)r.Humor!.Value)
                    : (double?)null,
                DiasComRegistro      = registros.Count,
                DiasAcademia         = registros.Count(r => r.TreinoTipo == "academia" || r.TreinoTipo == "ambos"),
                DiasVolei            = registros.Count(r => r.TreinoTipo == "volei"    || r.TreinoTipo == "ambos"),
                RendimentoTreinoMedio = registros.Any(r => r.TreinoRendimento.HasValue)
                    ? registros.Where(r => r.TreinoRendimento.HasValue).Average(r => (double)r.TreinoRendimento!.Value)
                    : (double?)null
            });
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(Guid id, RegistroDiario input)
        {
            var registro = await _db.RegistrosDiarios.FindAsync(id);
            if (registro == null) return NotFound();
            registro.Data             = input.Data;
            registro.HorasEstudo          = input.HorasEstudo;
            registro.TopicoEstudo         = input.TopicoEstudo;
            registro.TicketsTrabalhados   = input.TicketsTrabalhados;
            registro.HorasTrabalhadas     = input.HorasTrabalhadas;
            registro.Humor                = input.Humor;
            registro.Conquistas           = input.Conquistas;
            registro.Desafios             = input.Desafios;
            registro.Destaque             = input.Destaque;
            registro.TreinoTipo       = input.TreinoTipo;
            registro.TreinoRendimento = input.TreinoRendimento;
            registro.TreinoObs        = input.TreinoObs;
            await _db.SaveChangesAsync();
            return Ok(registro);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            var registro = await _db.RegistrosDiarios.FindAsync(id);
            if (registro == null) return NotFound();
            _db.RegistrosDiarios.Remove(registro);
            await _db.SaveChangesAsync();
            return NoContent();
        }
    }
}
```

### Controllers/ProjetosController.cs
```csharp
using NomeDoApp.API.Data;
using NomeDoApp.API.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace NomeDoApp.API.Controllers
{
    [ApiController]
    [Route("api/projetos")]
    public class ProjetosController : ControllerBase
    {
        private readonly AppDbContext _db;
        public ProjetosController(AppDbContext db) => _db = db;

        [HttpGet]
        public async Task<IActionResult> GetAll() =>
            Ok(await _db.Projetos.OrderBy(p => p.Nome).ToListAsync());

        [HttpPost]
        public async Task<IActionResult> Create(Projeto projeto)
        {
            projeto.Id = Guid.NewGuid();
            projeto.AtualizadoEm = DateTime.UtcNow;
            _db.Projetos.Add(projeto);
            await _db.SaveChangesAsync();
            return CreatedAtAction(nameof(GetAll), new { id = projeto.Id }, projeto);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(Guid id, Projeto input)
        {
            var projeto = await _db.Projetos.FindAsync(id);
            if (projeto == null) return NotFound();
            projeto.Nome        = input.Nome;
            projeto.Descricao   = input.Descricao;
            projeto.Stack       = input.Stack;
            projeto.Percentual  = input.Percentual;
            projeto.Status      = input.Status;
            projeto.AtualizadoEm = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            return Ok(projeto);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            var projeto = await _db.Projetos.FindAsync(id);
            if (projeto == null) return NotFound();
            _db.Projetos.Remove(projeto);
            await _db.SaveChangesAsync();
            return NoContent();
        }
    }
}
```

### Controllers/MetasController.cs
```csharp
using NomeDoApp.API.Data;
using NomeDoApp.API.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace NomeDoApp.API.Controllers
{
    [ApiController]
    [Route("api/metas")]
    public class MetasController : ControllerBase
    {
        private readonly AppDbContext _db;
        public MetasController(AppDbContext db) => _db = db;

        [HttpGet]
        public async Task<IActionResult> GetAll() =>
            Ok(await _db.MetasFinanceiras.OrderBy(m => m.Prazo).ToListAsync());

        [HttpPost]
        public async Task<IActionResult> Create(MetaFinanceira meta)
        {
            meta.Id = Guid.NewGuid();
            meta.AtualizadoEm = DateTime.UtcNow;
            _db.MetasFinanceiras.Add(meta);
            await _db.SaveChangesAsync();
            return CreatedAtAction(nameof(GetAll), new { id = meta.Id }, meta);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(Guid id, MetaFinanceira input)
        {
            var meta = await _db.MetasFinanceiras.FindAsync(id);
            if (meta == null) return NotFound();
            meta.Descricao   = input.Descricao;
            meta.ValorMeta   = input.ValorMeta;
            meta.ValorAtual  = input.ValorAtual;
            meta.Prazo       = input.Prazo;
            meta.AtualizadoEm = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            return Ok(meta);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            var meta = await _db.MetasFinanceiras.FindAsync(id);
            if (meta == null) return NotFound();
            _db.MetasFinanceiras.Remove(meta);
            await _db.SaveChangesAsync();
            return NoContent();
        }
    }
}
```

### Controllers/AnaliseController.cs
```csharp
using NomeDoApp.API.Data;
using NomeDoApp.API.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace NomeDoApp.API.Controllers
{
    [ApiController]
    [Route("api/analise")]
    public class AnaliseController : ControllerBase
    {
        private readonly AppDbContext _db;
        public AnaliseController(AppDbContext db) => _db = db;

        [HttpPost("gerar")]
        public async Task<IActionResult> Gerar([FromServices] AnaliseService analiseService)
        {
            try
            {
                var analise = await analiseService.GerarAnaliseSemanal();
                return Ok(analise);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = $"Erro ao gerar análise: {ex.Message}" });
            }
        }

        [HttpGet("ultima")]
        public async Task<IActionResult> GetUltima()
        {
            var analise = await _db.AnalisesSemanais
                .OrderByDescending(a => a.CriadoEm)
                .FirstOrDefaultAsync();
            return analise == null ? NotFound() : Ok(analise);
        }

        [HttpGet("historico")]
        public async Task<IActionResult> GetHistorico() =>
            Ok(await _db.AnalisesSemanais.OrderByDescending(a => a.CriadoEm).ToListAsync());
    }
}
```

### Controllers/FinanceiroController.cs
```csharp
using NomeDoApp.API.Services;
using Microsoft.AspNetCore.Mvc;

namespace NomeDoApp.API.Controllers
{
    [ApiController]
    [Route("api/financeiro")]
    public class FinanceiroController : ControllerBase
    {
        private readonly ClaudeService _claude;
        public FinanceiroController(ClaudeService claude) => _claude = claude;

        [HttpPost("analisar-extrato")]
        public async Task<IActionResult> AnalisarExtrato([FromBody] ExtratoRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Extrato))
                return BadRequest(new { error = "O extrato não pode estar vazio." });

            // ⚠️ PERSONALIZAR: ajuste o nome e contexto do usuário abaixo
            var prompt = $"""
                Você é um assistente financeiro pessoal de [NOME], [IDADE] anos, [CONTEXTO PROFISSIONAL] no Brasil.
                Analise o extrato bancário abaixo e organize as informações de forma clara e útil.

                EXTRATO:
                {request.Extrato}

                RESPONDA COM:
                1. Resumo do período: total de entradas, total de saídas e saldo líquido
                2. Gastos por categoria (alimentação, transporte, assinatura, lazer, moradia, outros) com valor total e % do total de saídas
                3. Top 3 maiores gastos individuais
                4. Um padrão ou comportamento financeiro identificado
                5. Uma recomendação financeira prática e direta

                Seja conciso. Use R$ para valores. Máximo 350 palavras.
                """;

            try
            {
                var analise = await _claude.Enviar(prompt, maxTokens: 1000);
                return Ok(new { analise });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }
    }

    public record ExtratoRequest(string Extrato);
}
```

---

## 8. BACKEND — SERVICES

### Services/ClaudeService.cs
```csharp
using System.Net.Http.Json;
using System.Text.Json.Serialization;

namespace NomeDoApp.API.Services
{
    public class ClaudeService
    {
        private readonly HttpClient _http;
        private readonly string _apiKey;

        public ClaudeService(HttpClient http, IConfiguration config)
        {
            _http = http;
            _apiKey = config["ClaudeApi:ApiKey"]
                ?? throw new InvalidOperationException("ClaudeApi:ApiKey não configurada.");
        }

        // Modelos disponíveis:
        // "claude-sonnet-4-6"          → melhor qualidade, análise semanal
        // "claude-haiku-4-5-20251001"  → mais rápido e barato, extrato/uso frequente
        public async Task<string> Enviar(string prompt, string model = "claude-haiku-4-5-20251001", int maxTokens = 1024)
        {
            var payload = new
            {
                model,
                max_tokens = maxTokens,
                messages = new[] { new { role = "user", content = prompt } }
            };

            using var request = new HttpRequestMessage(HttpMethod.Post, "https://api.anthropic.com/v1/messages");
            request.Headers.Add("x-api-key", _apiKey);
            request.Headers.Add("anthropic-version", "2023-06-01");
            request.Content = JsonContent.Create(payload);

            var response = await _http.SendAsync(request);

            if (!response.IsSuccessStatusCode)
            {
                var body = await response.Content.ReadAsStringAsync();
                throw new HttpRequestException($"Claude API {(int)response.StatusCode}: {body}");
            }

            var result = await response.Content.ReadFromJsonAsync<ClaudeApiResponse>();
            return result?.Content?.FirstOrDefault(c => c.Type == "text")?.Text ?? "";
        }
    }

    public class ClaudeApiResponse
    {
        [JsonPropertyName("content")]
        public List<ClaudeApiContent> Content { get; set; } = [];
    }

    public class ClaudeApiContent
    {
        [JsonPropertyName("type")]
        public string Type { get; set; } = "";

        [JsonPropertyName("text")]
        public string Text { get; set; } = "";
    }
}
```

### Services/AnaliseService.cs

> ⚠️ **Este é o arquivo mais importante para personalizar.** O método `MontarPrompt` contém o perfil do usuário e define o tom e o conteúdo da análise semanal.

```csharp
using NomeDoApp.API.Data;
using NomeDoApp.API.Models;
using Microsoft.EntityFrameworkCore;

namespace NomeDoApp.API.Services
{
    public class AnaliseService
    {
        private readonly AppDbContext _db;
        private readonly ClaudeService _claude;

        public AnaliseService(AppDbContext db, ClaudeService claude)
        {
            _db = db;
            _claude = claude;
        }

        public async Task<AnaliseSemanal> GerarAnaliseSemanal()
        {
            var fim            = DateTime.UtcNow;
            var inicio         = fim.AddDays(-7);
            var inicioAnterior = inicio.AddDays(-7);

            var registros  = await _db.RegistrosDiarios.Where(r => r.Data >= inicio).OrderBy(r => r.Data).ToListAsync();
            var anteriores = await _db.RegistrosDiarios.Where(r => r.Data >= inicioAnterior && r.Data < inicio).ToListAsync();
            var projetos   = await _db.Projetos.Where(p => p.Status != "concluído").ToListAsync();

            var prompt   = MontarPrompt(registros, anteriores, projetos, inicio, fim);
            var conteudo = await _claude.Enviar(prompt, model: "claude-sonnet-4-6", maxTokens: 1200);

            var analise = new AnaliseSemanal { SemanaInicio = inicio, SemanaFim = fim, Conteudo = conteudo };
            _db.AnalisesSemanais.Add(analise);
            await _db.SaveChangesAsync();
            return analise;
        }

        private static string MontarPrompt(
            List<RegistroDiario> registros, List<RegistroDiario> anteriores,
            List<Projeto> projetos, DateTime inicio, DateTime fim)
        {
            var totalHoras   = registros.Sum(r => r.HorasEstudo ?? 0);
            var horasAnterior = anteriores.Sum(r => r.HorasEstudo ?? 0);
            var topicos      = registros.Where(r => !string.IsNullOrWhiteSpace(r.TopicoEstudo)).Select(r => r.TopicoEstudo!).Distinct().ToList();
            var tickets          = registros.Sum(r => r.TicketsTrabalhados ?? 0);
            var horasTrabalhadas = registros.Sum(r => r.HorasTrabalhadas ?? 0);
            var humorList        = registros.Where(r => r.Humor.HasValue).Select(r => (double)r.Humor!.Value).ToList();
            var humorMedio       = humorList.Count != 0 ? humorList.Average() : 0;
            var conquistasList   = registros.Where(r => !string.IsNullOrWhiteSpace(r.Conquistas)).Select(r => r.Conquistas!).ToList();
            var desafiosList     = registros.Where(r => !string.IsNullOrWhiteSpace(r.Desafios)).Select(r => r.Desafios!).ToList();
            var destaques        = registros.Where(r => !string.IsNullOrWhiteSpace(r.Destaque)).Select(r => r.Destaque!).ToList();
            var diasAcademia = registros.Count(r => r.TreinoTipo == "academia" || r.TreinoTipo == "ambos");
            var diasVolei    = registros.Count(r => r.TreinoTipo == "volei"    || r.TreinoTipo == "ambos");
            var rendList     = registros.Where(r => r.TreinoRendimento.HasValue).Select(r => (double)r.TreinoRendimento!.Value).ToList();
            var rendMedio    = rendList.Count != 0 ? rendList.Average() : 0;
            var obsTreino    = registros.Where(r => !string.IsNullOrWhiteSpace(r.TreinoObs)).Select(r => r.TreinoObs!).ToList();
            var projetosStr  = projetos.Count != 0
                ? string.Join("\n", projetos.Select(p => $"- {p.Nome} ({p.Percentual}% concluído, {p.Status})"))
                : "Nenhum projeto em andamento.";

            // ⚠️ PERSONALIZAR: substitua o bloco PERFIL com os dados reais do usuário
            return $"""
                Você é um mentor de desenvolvimento pessoal e profissional.
                Analise os dados da semana de {inicio:dd/MM/yyyy} a {fim:dd/MM/yyyy} de [NOME]
                e gere um relatório honesto, direto e útil.

                PERFIL:
                - [IDADE] anos, [CONTEXTO — ex: dev em transição, estudante de medicina, etc.]
                - [STACK ou área — ex: C#/.NET, design, nutrição]
                - [META principal — ex: virar dev júnior em 6 meses]
                - [TREINOS — ex: academia 3x, caminhada, nenhum]
                - [CARACTERÍSTICA — ex: tende a procrastinar, perfeccionista, motivada]

                DADOS DA SEMANA:

                Estudos e trabalho:
                - Horas estudadas: {totalHoras:F1}h (semana anterior: {horasAnterior:F1}h)
                - Tópicos estudados: {(topicos.Count != 0 ? string.Join(", ", topicos) : "nenhum")}
                - Tickets trabalhados: {tickets}
                - Horas trabalhadas: {horasTrabalhadas:F1}h

                Reflexão:
                - Conquistas: {(conquistasList.Count != 0 ? string.Join("; ", conquistasList) : "nenhuma")}
                - Desafios: {(desafiosList.Count != 0 ? string.Join("; ", desafiosList) : "nenhum")}
                - Destaques: {(destaques.Count != 0 ? string.Join("; ", destaques) : "nenhum")}

                Humor:
                - Humor médio: {humorMedio:F1}/5

                Treino físico:
                - Dias de academia: {diasAcademia} (meta: 3x/semana)
                - Dias de vôlei: {diasVolei} (meta: 2x/semana)
                - Rendimento médio: {(rendMedio > 0 ? $"{rendMedio:F1}/5" : "não informado")}
                - Observações: {(obsTreino.Count != 0 ? string.Join("; ", obsTreino) : "nenhuma")}

                Projetos pessoais:
                {projetosStr}

                GERE:
                1. Uma frase de abertura que resume a semana em uma linha
                2. O que foi bem — máximo 3 pontos, específicos (inclua treino se relevante)
                3. O que pode melhorar — máximo 2 pontos, com sugestão prática
                4. Um padrão identificado ao longo das últimas semanas (se houver dados suficientes)
                5. Uma recomendação concreta para a próxima semana
                6. Uma frase de fechamento motivacional mas realista — sem clichê

                Seja direto. Não use listas com emoji. Máximo 400 palavras.
                Quando treino e produtividade estiverem correlacionados nos dados, mencione explicitamente.
                """;
        }
    }
}
```

---

## 9. FRONTEND — CONFIGURAÇÃO

### index.html
```html
<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>[NOME DO APP]</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

### vite.config.js
```js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({ plugins: [react()] });
```

### src/main.jsx
```jsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
createRoot(document.getElementById('root')).render(<StrictMode><App /></StrictMode>);
```

### src/index.css
```css
:root {
  --bg: #0f1117;
  --surface: #1a1d27;
  --border: #2a2d3e;
  --accent: #6366f1;
  --text: #e2e8f0;
  --muted: #94a3b8;
  --success: #10b981;
  --warning: #f59e0b;
  --danger: #ef4444;
}

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: var(--bg);
  color: var(--text);
  line-height: 1.5;
}

a { color: inherit; text-decoration: none; }

.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 20px;
}

.btn {
  padding: 9px 18px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: opacity 0.15s;
}
.btn:hover { opacity: 0.82; }
.btn:disabled { opacity: 0.45; cursor: not-allowed; }
.btn-primary   { background: var(--accent);  color: #fff; }
.btn-secondary { background: var(--border);  color: var(--text); }
.btn-danger    { background: var(--danger);  color: #fff; }

input, textarea, select {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text);
  padding: 10px 12px;
  font-size: 14px;
  width: 100%;
  outline: none;
  transition: border-color 0.15s;
  font-family: inherit;
}
input:focus, textarea:focus, select:focus { border-color: var(--accent); }
textarea { resize: vertical; min-height: 72px; }

label {
  font-size: 13px;
  color: var(--muted);
  font-weight: 500;
  display: block;
  margin-bottom: 6px;
}

.field { margin-bottom: 16px; }

.grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }

.section-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 16px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--border);
}

.muted { color: var(--muted); font-size: 13px; }

.progress-bar { height: 8px; background: var(--border); border-radius: 4px; overflow: hidden; }
.progress-fill { height: 100%; border-radius: 4px; background: var(--accent); transition: width 0.4s ease; }

@media (max-width: 900px) { .grid-4 { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 600px) { .grid-4, .grid-2 { grid-template-columns: 1fr; } }
```

---

## 10. FRONTEND — SERVIÇOS

### src/services/api.js

> ⚠️ Altere `BASE` para a URL do backend em produção antes do deploy.

```js
const BASE = 'http://localhost:5145/api';

async function req(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (res.status === 204) return null;
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export const api = {
  criarRegistro:       (body)     => req('/registros', { method: 'POST', body: JSON.stringify(body) }),
  listarRegistros:     (params)   => req(`/registros?${new URLSearchParams(params ?? {})}`),
  getSemana:           ()         => req('/registros/semana'),
  getResumo:           (params)   => req(`/registros/resumo?${new URLSearchParams(params ?? {})}`),
  deletarRegistro:     (id)       => req(`/registros/${id}`, { method: 'DELETE' }),

  listarProjetos:      ()         => req('/projetos'),
  criarProjeto:        (body)     => req('/projetos', { method: 'POST', body: JSON.stringify(body) }),
  atualizarProjeto:    (id, body) => req(`/projetos/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deletarProjeto:      (id)       => req(`/projetos/${id}`, { method: 'DELETE' }),

  listarMetas:         ()         => req('/metas'),
  criarMeta:           (body)     => req('/metas', { method: 'POST', body: JSON.stringify(body) }),
  atualizarMeta:       (id, body) => req(`/metas/${id}`, { method: 'PUT', body: JSON.stringify(body) }),

  gerarAnalise:        ()         => req('/analise/gerar', { method: 'POST' }),
  getUltimaAnalise:    ()         => req('/analise/ultima'),
  getHistoricoAnalise: ()         => req('/analise/historico'),

  analisarExtrato:     (extrato)  => req('/financeiro/analisar-extrato', { method: 'POST', body: JSON.stringify({ extrato }) }),
};
```

---

## 11. FRONTEND — APP E PÁGINAS

### src/App.jsx
```jsx
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import Home     from './pages/Home';
import Register from './pages/Register';
import History  from './pages/History';

const link   = { padding: '6px 14px', borderRadius: 8, fontSize: 14, fontWeight: 500, color: '#94a3b8', transition: 'all 0.15s' };
const active = { ...link, background: '#6366f120', color: '#a5b4fc' };

export default function App() {
  return (
    <BrowserRouter>
      <div style={{ minHeight: '100vh' }}>
        <nav style={{ background: '#1a1d27', borderBottom: '1px solid #2a2d3e', padding: '0 24px', display: 'flex', alignItems: 'center', gap: 8, height: 56, position: 'sticky', top: 0, zIndex: 100 }}>
          {/* ⚠️ PERSONALIZAR: altere o nome do app */}
          <span style={{ fontWeight: 700, fontSize: 15, color: '#e2e8f0', marginRight: 16 }}>Nome do App</span>
          <NavLink to="/"         end style={({ isActive }) => isActive ? active : link}>Dashboard</NavLink>
          <NavLink to="/registrar"    style={({ isActive }) => isActive ? active : link}>Registrar</NavLink>
          <NavLink to="/historico"    style={({ isActive }) => isActive ? active : link}>Histórico</NavLink>
        </nav>
        <main style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 20px' }}>
          <Routes>
            <Route path="/"          element={<Home />} />
            <Route path="/registrar" element={<Register />} />
            <Route path="/historico" element={<History />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
```

### src/pages/Home.jsx
```jsx
import Dashboard from '../components/Dashboard';
export default function Home() { return <Dashboard />; }
```

### src/pages/Register.jsx
```jsx
import { useNavigate } from 'react-router-dom';
import DailyForm from '../components/DailyForm';
export default function Register() {
  const navigate = useNavigate();
  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24 }}>Registrar o dia</h1>
      <DailyForm onSuccess={() => navigate('/')} />
    </div>
  );
}
```

---

## 12. FRONTEND — COMPONENTES

> Os componentes abaixo são os mesmos do projeto original. Para reutilizar, copie-os e ajuste apenas:
> - Textos e labels (ex: "Rift" → nome da empresa da sua namorada)
> - Campos do formulário que não se aplicam (ex: remover "Features Rift" se não for dev)
> - Metas de treino (ex: `diasAcademia >= 3` → alterar conforme rotina)

Os 7 componentes são: `DailyForm.jsx`, `Dashboard.jsx`, `WeeklyReport.jsx`, `ProjectTracker.jsx`, `FinancePanel.jsx`, `TrainingPanel.jsx`, `ExtratoPanel.jsx`.

Todos os arquivos estão no repositório em `frontend/src/components/`.

**Decisões de UX importantes que foram corrigidas durante o desenvolvimento:**
- Todo `<button>` dentro de `<form>` deve ter `type="button"` para não disparar submit acidentalmente
- `today()` deve usar data local (não `.toISOString().slice(0,10)` que usa UTC e quebra à noite)
- Seções colapsáveis mostram hint do conteúdo preenchido quando fechadas
- Confirmação de delete é inline (não usa `confirm()` nativo do browser)
- Todos os `salvar()` têm try/catch com mensagem de erro inline
- Validação de campos obrigatórios acontece antes de chamar a API

---

## 13. SETUP — PASSO A PASSO

### Pré-requisitos
- .NET 8 SDK
- Node.js 18+
- PostgreSQL rodando localmente

### Backend

```bash
# 1. Criar o projeto
dotnet new webapi -n NomeDoApp.API
cd NomeDoApp.API

# 2. Instalar pacotes
dotnet add package Npgsql.EntityFrameworkCore.PostgreSQL --version 8.0.11
dotnet add package Microsoft.EntityFrameworkCore.Design --version 8.0.11
dotnet add package Swashbuckle.AspNetCore

# 3. Criar os arquivos conforme seções 5 a 8 deste documento

# 4. Configurar appsettings.json com connection string e API key

# 5. Criar e aplicar migrations
dotnet ef migrations add InitialCreate
dotnet ef database update

# 6. Rodar
dotnet run
# Acesse: http://localhost:5145/swagger
```

### Frontend

```bash
# No diretório raiz do projeto
mkdir frontend && cd frontend
npm create vite@latest . -- --template react
npm install react-router-dom recharts

# Substituir todos os arquivos src/ pelos da seção 9-12

npm run dev
# Acesse: http://localhost:5173
```

### .gitignore (raiz do projeto)
```gitignore
# .NET
backend/**/bin/
backend/**/obj/
backend/**/*.user
backend/**/appsettings.json
backend/**/appsettings.Development.json
backend/**/appsettings.Local.json
backend/**/*.db

# Frontend
frontend/node_modules/
frontend/dist/
frontend/.env
frontend/.env.local
frontend/.env.*.local

# IDE
.vscode/
.idea/
.vs/

# OS
.DS_Store
Thumbs.db
```

---

## 14. ENDPOINTS DISPONÍVEIS

```
# Registros diários
POST   /api/registros              → cria registro
GET    /api/registros              → lista (filtros: ?inicio=&fim=)
GET    /api/registros/{id}         → busca por id
GET    /api/registros/semana       → últimos 7 dias
GET    /api/registros/resumo       → agregados da semana (horas, bugs, etc.)
PUT    /api/registros/{id}         → atualiza
DELETE /api/registros/{id}         → remove

# Projetos
GET    /api/projetos               → lista
POST   /api/projetos               → cria
PUT    /api/projetos/{id}          → atualiza
DELETE /api/projetos/{id}          → remove

# Metas financeiras
GET    /api/metas                  → lista
POST   /api/metas                  → cria
PUT    /api/metas/{id}             → atualiza
DELETE /api/metas/{id}             → remove

# Análise semanal (Claude Sonnet 4.6)
POST   /api/analise/gerar          → gera análise semanal com os dados reais
GET    /api/analise/ultima         → retorna a análise mais recente
GET    /api/analise/historico      → todas as análises

# Financeiro (Claude Haiku 4.5)
POST   /api/financeiro/analisar-extrato  → analisa extrato bancário colado
```

---

## 15. PERSONALIZAÇÃO — CHECKLIST PARA NOVA INSTÂNCIA

Ao recriar para outra pessoa, altere os seguintes pontos:

### Backend
- [ ] `FinanceiroController.cs` — linha do prompt: substituir nome, idade e contexto profissional
- [ ] `AnaliseService.cs` → bloco `PERFIL:` no `MontarPrompt` — adaptar para o perfil real
- [ ] Campos de `RegistroDiario.cs` — remover/adicionar campos específicos (ex: remover `TicketsTrabalhados`/`HorasTrabalhadas` se não for dev; adicionar `HorasLeitura`, `PaginasLidas`, etc.)
- [ ] Campos do `GetResumo` no controller — recalcular para os novos campos
- [ ] Nome do banco no `appsettings.json`

### Frontend
- [ ] `App.jsx` — nome do app na navbar
- [ ] `DailyForm.jsx` — seções e campos (remover "Trabalho (Rift)", adicionar o que fizer sentido)
- [ ] `Dashboard.jsx` — labels dos cards de resumo
- [ ] `TrainingPanel.jsx` — metas de treino (`diasAcademia >= 3`, `diasVolei >= 2`) conforme rotina
- [ ] `api.js` — URL base em produção

### Exemplos de adaptação por perfil

**Estudante:**
- Trocar `TicketsTrabalhados`/`HorasTrabalhadas` por `HorasAula`, `ExerciciosFeitos`
- Adicionar `Materia` ao invés de `TopicoEstudo`
- Prompt: "estudante de [curso], meta: passar no vestibular/concurso"

**Profissional de saúde:**
- Adicionar `PacientesAtendidos`, `HorasPlantao`
- Trocar treino de academia/vôlei por caminhada/pilates/corrida
- Prompt: "enfermeira/médica, meta: qualidade de vida e evolução profissional"

**Empreendedor:**
- Adicionar `VendasDia`, `LeadsGerados`, `TarefasConcluidasTrello`
- Prompt: "empreendedor, meta: escalar o negócio"

---

## 16. ESTADO ATUAL DO PROJETO (versão Leo)

| Funcionalidade | Status |
|---|---|
| Registro diário com seções colapsáveis | ✅ Completo |
| Dashboard com 4 cards de resumo | ✅ Completo |
| Gráfico de linha: horas de estudo | ✅ Completo |
| Gráfico de barra: humor da semana | ✅ Completo |
| Gráfico de pizza: tópicos estudados | ✅ Completo |
| CRUD de projetos com barra de progresso | ✅ Completo |
| CRUD de metas financeiras com barra | ✅ Completo |
| Análise de treino (cards + gráfico empilhado) | ✅ Completo |
| Análise semanal real via Claude Sonnet 4.6 | ✅ Completo |
| Análise de extrato bancário via Claude Haiku | ✅ Completo |
| Histórico com delete inline | ✅ Completo |
| Banner "registrar hoje" no dashboard | ✅ Completo |
| Deploy (Vercel + Railway) | ⏳ Pendente |
| Notificação por email (análise semanal) | ⏳ Futuro |
| Import de commits do GitHub | ⏳ Futuro |

---

## 17. OBSERVAÇÕES TÉCNICAS IMPORTANTES

1. **Datas:** sempre usar `new Date(data + 'T12:00:00').toISOString()` no frontend (meio-dia local) para evitar bug de fuso horário à noite. Nunca usar `new Date().toISOString().slice(0,10)` que retorna data UTC.

2. **Botões em formulários:** todo `<button>` dentro de `<form>` HTML precisa de `type="button"`. Sem isso, qualquer clique dispara o submit.

3. **Claude API — billing:** a API exige créditos pagos. Mínimo $5 no [console.anthropic.com](https://console.anthropic.com) cobre meses de uso pessoal com Haiku. Sonnet é ~20x mais caro que Haiku — por isso a análise semanal usa Sonnet (1x/semana) e o extrato usa Haiku (uso frequente).

4. **CORS:** o backend está configurado para aceitar apenas `http://localhost:5173`. Em produção, atualizar `WithOrigins` no `Program.cs` para a URL do Vercel.

5. **appsettings.json:** nunca commitar. Criar `appsettings.example.json` como template sem valores reais.

6. **EF Core + PostgreSQL:** as migrations criam o banco e as tabelas automaticamente. Nunca precisa rodar SQL manualmente.

7. **Análise semanal:** o botão "Gerar análise" só aparece se passaram 7+ dias desde a última geração. Verificado no frontend via `diasDesdeUltima() >= 7`.
