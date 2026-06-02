using System.Text;
using System.Text.Json;
using LeoDevTracker.API.Data;
using LeoDevTracker.API.Helpers;
using LeoDevTracker.API.Models;
using LeoDevTracker.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace LeoDevTracker.API.Controllers
{
    [ApiController]
    [Route("api/registros")]
    [Authorize]
    public class RegistrosController : ControllerBase
    {
        private readonly AppDbContext _db;

        public RegistrosController(AppDbContext db) => _db = db;

        [HttpPost]
        public async Task<IActionResult> Create(RegistroDiario registro, [FromServices] IAiService ai)
        {
            var usuario = UsuarioHelper.GetUsuario(User)!;

            var dataLocal = registro.Data.Date;
            var jaExiste = await _db.RegistrosDiarios
                .AnyAsync(r => r.Usuario == usuario && r.Data.Date == dataLocal);
            if (jaExiste)
            {
                var dtStr = dataLocal.ToString("dd/MM/yyyy");
                return Conflict(new { error = $"Você já tem um registro para {dtStr}. Exclua o anterior pelo Histórico para registrar novamente." });
            }

            registro.Id = Guid.NewGuid();
            registro.CriadoEm = DateTime.UtcNow;
            registro.Usuario = usuario;
            _db.RegistrosDiarios.Add(registro);
            await _db.SaveChangesAsync();

            // Contexto para IA: últimos 5 registros antes de hoje
            var ultimos5 = await _db.RegistrosDiarios
                .Where(r => r.Usuario == usuario && r.Data.Date < dataLocal)
                .OrderByDescending(r => r.Data)
                .Take(5)
                .ToListAsync();

            string insightFallback = usuario == "rafa"
                ? "Registro salvo. Cuide-se bem hoje."
                : "Registro salvo. Continue avançando.";

            string? insightErro = null;
            try
            {
                string prompt;
                if (usuario == "rafa")
                {
                    var alertaHumor = CheckAlertaHumor(registro, ultimos5);
                    prompt = registro.Humor <= 2
                        ? MontarPromptRafaCuidado(registro, ultimos5)
                        : MontarPromptInsightRafa(registro, ultimos5, alertaHumor);
                }
                else
                {
                    var projetos = await _db.Projetos
                        .Where(p => p.Usuario == usuario && p.Status != "concluído")
                        .ToListAsync();
                    var ultimosTreino = await _db.RegistrosDiarios
                        .Where(r => r.Usuario == usuario && r.Data.Date < dataLocal)
                        .OrderByDescending(r => r.Data)
                        .Take(30)
                        .ToListAsync();
                    var streak = CalcStreak(registro, ultimosTreino);
                    prompt = MontarPromptInsightLeo(registro, ultimos5, projetos, streak);
                }
                var insight = await ai.Enviar(prompt, AiModelos.Flash, maxTokens: 500);
                registro.InsightDiario = string.IsNullOrWhiteSpace(insight) ? insightFallback : insight;
                await _db.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                insightErro = ex.Message;
                registro.InsightDiario = insightFallback;
                await _db.SaveChangesAsync();
            }

            await LogarRegistro(registro, insightErro);

            return CreatedAtAction(nameof(GetById), new { id = registro.Id }, registro);
        }

        private static async Task LogarRegistro(RegistroDiario r, string? insightErro)
        {
            try
            {
                var logDir = Path.Combine(Directory.GetCurrentDirectory(), "logs");
                Directory.CreateDirectory(logDir);
                var logPath = Path.Combine(logDir, $"registros_{DateTime.Now:yyyy-MM}.log");

                var sb = new StringBuilder();
                sb.AppendLine($"[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] REGISTRO CRIADO — {r.Usuario}");
                sb.AppendLine($"  Data:          {r.Data:dd/MM/yyyy}");
                sb.AppendLine($"  Humor:         {r.Humor}/5");
                if (r.HorasEstudo.HasValue)
                    sb.AppendLine($"  Estudo:        {r.HorasEstudo:F1}h" +
                        (r.TopicoEstudo != null ? $" — {r.TopicoEstudo}" : ""));
                if (r.TicketsTrabalhados.HasValue || r.HorasTrabalhadas.HasValue)
                    sb.AppendLine($"  Trabalho:      {r.TicketsTrabalhados ?? 0} tickets, {r.HorasTrabalhadas:F1}h");
                if (!string.IsNullOrWhiteSpace(r.TreinoTipo))
                    sb.AppendLine($"  Treino:        {r.TreinoTipo}" +
                        (r.TreinoRendimento.HasValue ? $", rendimento {r.TreinoRendimento}/5" : ""));
                if (!string.IsNullOrWhiteSpace(r.Conquistas))
                    sb.AppendLine($"  Conquistas:    {r.Conquistas}");
                if (!string.IsNullOrWhiteSpace(r.Desafios))
                    sb.AppendLine($"  Desafios:      {r.Desafios}");
                if (!string.IsNullOrWhiteSpace(r.DadosExtras))
                    sb.AppendLine($"  Extras:        {r.DadosExtras}");
                if (!string.IsNullOrWhiteSpace(r.InsightDiario))
                    sb.AppendLine($"  Insight:       {r.InsightDiario}");
                else if (insightErro != null)
                    sb.AppendLine($"  Insight:       ERRO — {insightErro}");
                else
                    sb.AppendLine($"  Insight:       (não gerado)");
                sb.AppendLine(new string('-', 64));

                await System.IO.File.AppendAllTextAsync(logPath, sb.ToString(), Encoding.UTF8);
            }
            catch { }
        }

        private static string MontarPromptInsightLeo(RegistroDiario r, List<RegistroDiario> ultimos5, List<Projeto> projetos, int streakTreino)
        {
            var tendencia = ultimos5.Count > 0
                ? "TENDÊNCIA DOS ÚLTIMOS 5 DIAS:\n" + string.Join("\n", ultimos5
                    .OrderBy(p => p.Data)
                    .Select(p =>
                    {
                        var pts = new List<string> { p.Data.ToString("dd/MM") };
                        if (p.Humor.HasValue) pts.Add($"humor {p.Humor}");
                        if (p.HorasEstudo > 0) pts.Add($"{p.HorasEstudo:F1}h estudo" + (p.TopicoEstudo != null ? $" ({p.TopicoEstudo})" : ""));
                        if (!string.IsNullOrEmpty(p.TreinoTipo) && p.TreinoTipo != "nenhum") pts.Add($"treino: {p.TreinoTipo}");
                        if (!string.IsNullOrEmpty(p.Destaque)) pts.Add($"\"{p.Destaque}\"");
                        return "- " + string.Join(", ", pts);
                    }))
                : "TENDÊNCIA: sem registros anteriores.";

            var projetosBloco = projetos.Count > 0
                ? "PROJETOS ATIVOS:\n" + string.Join("\n", projetos.Select(p =>
                    $"- {p.Nome}: {p.Percentual}%{(p.ProximoPasso != null ? $" → {p.ProximoPasso}" : "")} ({p.Status})"))
                : "PROJETOS: nenhum ativo cadastrado.";

            var streakTxt = streakTreino > 1
                ? $"{streakTreino} dias consecutivos de treino."
                : streakTreino == 1 ? "Primeiro dia na sequência de treino."
                : "Nenhuma sequência de treino ativa.";

            var treinoHoje = !string.IsNullOrEmpty(r.TreinoTipo) && r.TreinoTipo != "nenhum";

            var humorHint = r.Humor <= 1 ? "(dia difícil — priorize acolhimento)"
                          : r.Humor <= 3 ? "(dia mediano)"
                          : "(dia bom)";

            return $"""
                Você é um amigo próximo do Leo que acompanha sua jornada como dev em transição. Você torce genuinamente por ele e conhece seus altos e baixos.

                REGRAS DE TOM (siga rigorosamente):
                - Humor 1: APENAS acolhimento. Proibido mencionar estudo, trabalho, metas ou projetos. Valide que dias ruins fazem parte.
                - Humor 2–3: reconheça o esforço de ter aparecido. Ação pequena e gentil para amanhã.
                - Humor 4–5: energia e celebração genuína. Pode ser mais direto e animado.

                SEMPRE:
                - Tom de amigo, nunca de coach corporativo
                - Se ele estudou ou treinou num dia difícil, isso é extraordinário — diga isso
                - Ação concreta mas humana, não uma ordem
                - Proibido frases como "os dados mostram", "é importante que", "dedique X horas"
                - Sem elogios vazios, mas com calor humano real

                Retorne APENAS 2 frases em português. Sem listas, sem marcadores, sem emojis. Máximo 80 palavras.
                IMPORTANTE: Sempre retorne resposta.

                HOJE ({r.Data:dd/MM/yyyy}):
                - Humor do dia: {r.Humor?.ToString() ?? "?"}/5 {humorHint}
                - Estudo: {r.HorasEstudo?.ToString("F1") ?? "0"}h em {r.TopicoEstudo ?? "não informado"}
                - Trabalho Rift: {r.FeaturesRift} feat, {r.BugsRift} bugs, {r.TicketsTrabalhados ?? 0} tickets, {r.HorasTrabalhadas:F1}h
                - Treino: {(treinoHoje ? $"{r.TreinoTipo}, rendimento {r.TreinoRendimento?.ToString() ?? "?"}/5" : "não treinou")}
                - Destaque: {r.Destaque ?? "não informado"}
                - Desafios: {r.Desafios ?? "não informado"}
                - Streak de treino: {streakTxt}

                {tendencia}

                {projetosBloco}
                """;
        }

        private static string MontarPromptInsightRafa(RegistroDiario r, List<RegistroDiario> ultimos5, bool alertaHumor)
        {
            RafaExtras? extras = null;
            if (!string.IsNullOrWhiteSpace(r.DadosExtras))
            {
                try { extras = JsonSerializer.Deserialize<RafaExtras>(r.DadosExtras, new JsonSerializerOptions { PropertyNameCaseInsensitive = true }); }
                catch { }
            }

            var tendencia = ultimos5.Count > 0
                ? "ÚLTIMOS 5 DIAS (tendência):\n" + string.Join("\n", ultimos5
                    .OrderBy(p => p.Data)
                    .Select(p =>
                    {
                        var pts = new List<string> { p.Data.ToString("dd/MM") };
                        if (p.Humor.HasValue) pts.Add($"humor {p.Humor}");
                        var sono = ExtrasHelper.GetInt(p.DadosExtras, "qualidadeSono");
                        if (sono > 0) pts.Add($"sono {sono}/5");
                        var atend = ExtrasHelper.GetInt(p.DadosExtras, "atendimentos");
                        if (atend > 0) pts.Add($"{atend} atend.");
                        if (!string.IsNullOrEmpty(p.TreinoTipo) && p.TreinoTipo != "nenhum") pts.Add($"treino: {p.TreinoTipo}");
                        return "- " + string.Join(", ", pts);
                    }))
                : "ÚLTIMOS DIAS: sem registros anteriores.";

            var alerta = alertaHumor
                ? "ATENÇÃO: Rafa está tendo dias difíceis seguidos. Seja especialmente gentil. Nada de cobranças ou metas. Ela precisa sentir que não está sozinha nisso."
                : "";

            var humorHint = r.Humor <= 1 ? "(dia difícil — só acolhimento)"
                          : r.Humor <= 3 ? "(dia mediano)"
                          : "(dia bom)";

            return $"""
                Você é uma amiga próxima da Rafa que a acompanha com carinho genuíno. Rafa é psicóloga, cuida muito dos outros e às vezes esquece de se cuidar.

                REGRAS DE TOM (siga rigorosamente):
                - Humor 1: APENAS acolhimento e carinho. Zero menção a atendimentos, conteúdo ou metas. Ela precisa de colo, não de análise.
                - Humor 2–3: reconheça o que ela conseguiu fazer mesmo assim. Ação gentil e pequena.
                - Humor 4–5: celebre com ela! Energia leve e calorosa.

                SEMPRE:
                - Se ela registrou gratidão, isso importa — reflita isso de volta com carinho
                - Se ela treinou num dia difícil, reconheça como conquista real
                - Proibido frases como "os dados mostram", "é importante", "você deve"
                - Tom de amiga que entende, não de terapeuta analisando dados
                - Encorajamento baseado no que ela realmente fez, não no que deveria fazer

                Retorne APENAS 3 frases em português. Sem listas, sem marcadores, sem emojis. Máximo 100 palavras.
                IMPORTANTE: Sempre retorne resposta.

                {alerta}

                HOJE ({r.Data:dd/MM/yyyy}):
                - Humor do dia: {r.Humor?.ToString() ?? "?"}/5 {humorHint}
                - Sono: {extras?.QualidadeSono?.ToString() ?? "?"}/5
                - Atendimentos: {extras?.Atendimentos ?? 0}{(extras?.Cancelamentos > 0 ? $", {extras.Cancelamentos} cancelamento(s) ({extras.MotivoCancelamento ?? "motivo não informado"})" : "")}
                - Conteúdo postado: {extras?.ConteudoPostado ?? 0}
                - Gratidão: {extras?.Gratidao ?? "não registrada"}
                - Treino: {r.TreinoTipo ?? "nenhum"}{(r.TreinoRendimento.HasValue ? $", rendimento {r.TreinoRendimento}/5" : "")}
                - Lazer: {extras?.Lazer ?? "nenhum"}{(extras?.LazerIntensidade > 0 ? $", intensidade {extras.LazerIntensidade}/5" : "")}

                {tendencia}
                """;
        }

        [HttpGet("exportar/pdf")]
        public async Task<IActionResult> ExportarPdf()
        {
            var usuario = UsuarioHelper.GetUsuario(User)!;
            var inicio = DateTime.UtcNow.AddDays(-7).Date;
            var registros = await _db.RegistrosDiarios
                .Where(r => r.Usuario == usuario && r.Data >= inicio)
                .OrderByDescending(r => r.Data)
                .ToListAsync();

            var pdf = GerarPdf(usuario, registros, inicio, DateTime.UtcNow.Date);
            var fileName = $"devtracker-historico-{DateTime.Now:dd-MM-yyyy}.pdf";
            return File(pdf, "application/pdf", fileName);
        }

        private static byte[] GerarPdf(string usuario, List<RegistroDiario> registros, DateTime inicio, DateTime fim)
        {
            var nomeUsuario = usuario == "rafa" ? "Rafa" : "Leo";
            var isRafa = usuario == "rafa";

            var doc = Document.Create(container =>
            {
                container.Page(page =>
                {
                    page.Size(PageSizes.A4);
                    page.MarginHorizontal(40);
                    page.MarginVertical(36);
                    page.DefaultTextStyle(x => x.FontSize(10).FontColor("#1e293b"));

                    // ── Cabeçalho ─────────────────────────────────────
                    page.Header().Column(col =>
                    {
                        col.Item().Row(row =>
                        {
                            row.RelativeItem().Column(c =>
                            {
                                c.Item().Text($"Leo Dev Tracker — {nomeUsuario}")
                                    .FontSize(18).Bold().FontColor("#0f172a");
                                c.Item().Text($"{inicio:dd/MM/yyyy} a {fim:dd/MM/yyyy}")
                                    .FontSize(11).FontColor("#64748b");
                            });
                            row.ConstantItem(80).AlignRight().AlignBottom()
                                .Text($"{registros.Count} registros")
                                .FontSize(10).FontColor("#94a3b8");
                        });
                        col.Item().PaddingTop(8).LineHorizontal(1).LineColor("#e2e8f0");
                        col.Item().Height(12);
                    });

                    // ── Conteúdo ───────────────────────────────────────
                    page.Content().Column(col =>
                    {
                        if (registros.Count == 0)
                        {
                            col.Item().PaddingTop(24)
                                .Text("Nenhum registro nos últimos 7 dias.")
                                .FontSize(12).FontColor("#64748b");
                            return;
                        }

                        foreach (var r in registros)
                        {
                            col.Item()
                                .Border(1).BorderColor("#e2e8f0")
                                .Background("#f8fafc")
                                .Padding(14)
                                .Column(card =>
                                {
                                    // Linha de cabeçalho do card
                                    card.Item().Row(row =>
                                    {
                                        row.RelativeItem()
                                            .Text(r.Data.ToString("dddd, dd/MM/yyyy", new System.Globalization.CultureInfo("pt-BR")))
                                            .FontSize(12).Bold().FontColor("#0f172a");
                                        if (r.Humor.HasValue)
                                            row.ConstantItem(70).AlignRight()
                                                .Text($"Humor {r.Humor}/5 {HumorLabel(r.Humor.Value)}")
                                                .FontSize(10).FontColor(HumorCor(r.Humor.Value));
                                    });

                                    card.Item().PaddingTop(6).LineHorizontal(1).LineColor("#e2e8f0");
                                    card.Item().Height(6);

                                    // Campos dependem do usuário
                                    if (isRafa)
                                    {
                                        var sono = ExtrasHelper.GetInt(r.DadosExtras, "qualidadeSono");
                                        var atend = ExtrasHelper.GetInt(r.DadosExtras, "atendimentos");
                                        var gratidao = ExtrasHelper.GetString(r.DadosExtras, "gratidao");
                                        if (sono > 0) AddCampo(card, "Sono", $"{sono}/5");
                                        if (atend > 0) AddCampo(card, "Atendimentos", atend.ToString());
                                        if (!string.IsNullOrEmpty(gratidao)) AddCampo(card, "Gratidão", gratidao);
                                    }
                                    else
                                    {
                                        if (r.HorasEstudo > 0)
                                            AddCampo(card, "Estudo", $"{r.HorasEstudo:F1}h" + (r.TopicoEstudo != null ? $" — {r.TopicoEstudo}" : ""));
                                        if (r.FeaturesRift > 0 || r.BugsRift > 0)
                                            AddCampo(card, "Rift", $"{r.FeaturesRift} feat · {r.BugsRift} bugs");
                                    }

                                    if (!string.IsNullOrEmpty(r.TreinoTipo) && r.TreinoTipo != "nenhum")
                                        AddCampo(card, "Treino", r.TreinoTipo +
                                            (r.TreinoRendimento.HasValue ? $" · rendimento {r.TreinoRendimento}/5" : ""));

                                    if (!string.IsNullOrEmpty(r.Destaque))
                                        AddCampo(card, "Destaque", r.Destaque);
                                    if (!string.IsNullOrEmpty(r.Desafios))
                                        AddCampo(card, "Desafios", r.Desafios);
                                    if (!string.IsNullOrEmpty(r.Conquistas))
                                        AddCampo(card, "Conquistas", r.Conquistas);

                                    if (!string.IsNullOrEmpty(r.InsightDiario))
                                    {
                                        card.Item().PaddingTop(6)
                                            .Background("#f1f5f9")
                                            .Padding(8)
                                            .Text(r.InsightDiario)
                                            .FontSize(9).Italic().FontColor("#475569");
                                    }
                                });

                            col.Item().Height(10);
                        }
                    });

                    // ── Rodapé ─────────────────────────────────────────
                    page.Footer().AlignCenter()
                        .Text($"Leo Dev Tracker — gerado em {DateTime.Now:dd/MM/yyyy HH:mm}")
                        .FontSize(8).FontColor("#94a3b8");
                });
            });

            return doc.GeneratePdf();
        }

        private static void AddCampo(ColumnDescriptor col, string label, string valor)
        {
            col.Item().Row(row =>
            {
                row.ConstantItem(80).Text(label).FontSize(9).FontColor("#64748b");
                row.RelativeItem().Text(valor).FontSize(10).FontColor("#1e293b");
            });
            col.Item().Height(3);
        }

        private static string HumorLabel(int h) => h switch
        {
            1 => "☹",
            2 => ":|",
            3 => ":-|",
            4 => ":)",
            5 => ":D",
            _ => ""
        };

        private static string HumorCor(int h) => h switch
        {
            1 => "#ef4444",
            2 => "#f97316",
            3 => "#94a3b8",
            4 => "#22c55e",
            5 => "#10b981",
            _ => "#94a3b8"
        };

        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] DateTime? inicio, [FromQuery] DateTime? fim)
        {
            var usuario = UsuarioHelper.GetUsuario(User)!;
            var query = _db.RegistrosDiarios.Where(r => r.Usuario == usuario);

            if (inicio.HasValue)
                query = query.Where(r => r.Data >= inicio.Value);
            if (fim.HasValue)
                query = query.Where(r => r.Data <= fim.Value);

            return Ok(await query.OrderByDescending(r => r.Data).ToListAsync());
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            var usuario = UsuarioHelper.GetUsuario(User)!;
            var registro = await _db.RegistrosDiarios.FindAsync(id);
            if (registro == null || registro.Usuario != usuario) return NotFound();
            return Ok(registro);
        }

        [HttpGet("semana")]
        public async Task<IActionResult> GetSemana()
        {
            var usuario = UsuarioHelper.GetUsuario(User)!;
            var inicio = DateTime.UtcNow.AddDays(-7).Date;
            var registros = await _db.RegistrosDiarios
                .Where(r => r.Usuario == usuario && r.Data >= inicio)
                .OrderByDescending(r => r.Data)
                .ToListAsync();
            return Ok(registros);
        }

        [HttpGet("resumo")]
        public async Task<IActionResult> GetResumo([FromQuery] DateTime? inicio, [FromQuery] DateTime? fim)
        {
            var usuario = UsuarioHelper.GetUsuario(User)!;
            var dataInicio = inicio ?? DateTime.UtcNow.AddDays(-7).Date;
            var dataFim = fim ?? DateTime.UtcNow.Date;

            var registros = await _db.RegistrosDiarios
                .Where(r => r.Usuario == usuario && r.Data >= dataInicio && r.Data <= dataFim)
                .ToListAsync();

            var resumo = new
            {
                TotalHorasEstudo = registros.Sum(r => r.HorasEstudo ?? 0),
                TotalFeaturesRift = registros.Sum(r => r.FeaturesRift),
                TotalBugsRift = registros.Sum(r => r.BugsRift),
                TotalTicketsRift = registros.Sum(r => r.TicketsTrabalhados ?? 0),
                TotalHorasTrabalhadas = registros.Sum(r => r.HorasTrabalhadas ?? 0),
                HumorMedio = registros.Any(r => r.Humor.HasValue)
                    ? registros.Where(r => r.Humor.HasValue).Average(r => (double)r.Humor!.Value)
                    : (double?)null,
                DiasComRegistro = registros.Count,
                DiasAcademia = registros.Count(r => r.TreinoTipo == "academia" || r.TreinoTipo == "ambos"),
                DiasVolei = registros.Count(r => r.TreinoTipo == "volei" || r.TreinoTipo == "ambos"),
                RendimentoTreinoMedio = registros.Any(r => r.TreinoRendimento.HasValue)
                    ? registros.Where(r => r.TreinoRendimento.HasValue).Average(r => (double)r.TreinoRendimento!.Value)
                    : (double?)null
            };

            return Ok(resumo);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(Guid id, RegistroDiario input)
        {
            var usuario = UsuarioHelper.GetUsuario(User)!;
            var registro = await _db.RegistrosDiarios.FindAsync(id);
            if (registro == null || registro.Usuario != usuario) return NotFound();

            registro.Data = input.Data;
            registro.HorasEstudo = input.HorasEstudo;
            registro.TopicoEstudo = input.TopicoEstudo;
            registro.FeaturesRift = input.FeaturesRift;
            registro.BugsRift = input.BugsRift;
            registro.TicketsTrabalhados = input.TicketsTrabalhados;
            registro.HorasTrabalhadas = input.HorasTrabalhadas;
            registro.Humor = input.Humor;
            registro.Conquistas = input.Conquistas;
            registro.Desafios = input.Desafios;
            registro.Destaque = input.Destaque;
            registro.TreinoTipo = input.TreinoTipo;
            registro.TreinoRendimento = input.TreinoRendimento;
            registro.TreinoObs = input.TreinoObs;
            registro.DadosExtras = input.DadosExtras;

            await _db.SaveChangesAsync();
            return Ok(registro);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            var usuario = UsuarioHelper.GetUsuario(User)!;
            var registro = await _db.RegistrosDiarios.FindAsync(id);
            if (registro == null || registro.Usuario != usuario) return NotFound();
            _db.RegistrosDiarios.Remove(registro);
            await _db.SaveChangesAsync();
            return NoContent();
        }

        private static string MontarPromptRafaCuidado(RegistroDiario r, List<RegistroDiario> ultimos5)
        {
            var diasRecentes = ultimos5.Take(3).OrderBy(p => p.Data)
                .Where(p => p.Humor.HasValue)
                .Select(p => $"{p.Data:dd/MM} humor {p.Humor}");
            var contextoRecente = diasRecentes.Any()
                ? "Dias recentes: " + string.Join(", ", diasRecentes)
                : "";

            return $"""
                Você é uma amiga próxima da Rafa, psicóloga de 30 anos passando por um dia difícil.
                Ela registrou humor {r.Humor}/5 hoje.

                O que ela registrou:
                - Conquistas: {r.Conquistas ?? "não registrou"}
                - Gratidão: {ExtrasHelper.GetString(r.DadosExtras, "gratidao") ?? "não registrou"}
                - Treino: {r.TreinoTipo ?? "não registrou"}
                {contextoRecente}

                Responda em 2 partes:
                [Acolhimento] Reconheça que foi difícil — sem minimizar, sem elogios vazios. 1-2 frases.
                [Amanhã] UMA coisa pequena e gentil para amanhã — algo que ela consiga mesmo cansada.

                REGRAS:
                - Não mencione produtividade, metas, atendimentos ou trabalho
                - Não compare com outras semanas
                - Sem frases de coach ou motivacionais
                - Tom: amiga que entende, não terapeuta
                - Máximo 60 palavras
                - Se não registrou gratidão nem conquistas: reconheça o ato de ter registrado como força
                - IMPORTANTE: Sempre retorne uma resposta, nunca retorne vazio
                """;
        }

        private static bool CheckAlertaHumor(RegistroDiario hoje, List<RegistroDiario> ultimos5)
        {
            var humores = ultimos5.Take(2)
                .Where(r => r.Humor.HasValue)
                .Select(r => (double)r.Humor!.Value)
                .ToList();
            if (hoje.Humor.HasValue) humores.Add((double)hoje.Humor.Value);
            return humores.Count >= 2 && humores.Average() <= 2;
        }

        private static int CalcStreak(RegistroDiario hoje, List<RegistroDiario> ultimos5)
        {
            var treinoHoje = !string.IsNullOrEmpty(hoje.TreinoTipo) && hoje.TreinoTipo != "nenhum";
            if (!treinoHoje) return 0;

            var streak = 1;
            var prevDate = hoje.Data.Date.AddDays(-1);
            foreach (var r in ultimos5.OrderByDescending(r => r.Data))
            {
                if (r.Data.Date != prevDate) break;
                if (string.IsNullOrEmpty(r.TreinoTipo) || r.TreinoTipo == "nenhum") break;
                streak++;
                prevDate = prevDate.AddDays(-1);
            }
            return streak;
        }
    }

    // DTO para deserializar os extras da Rafa
    internal class RafaExtras
    {
        public bool? AguaBebida { get; set; }
        public bool? SeguiuDieta { get; set; }
        public int? QualidadeSono { get; set; }
        public string? Gratidao { get; set; }
        public int? Atendimentos { get; set; }
        public bool? Supervisao { get; set; }
        public int? ConteudoPostado { get; set; }
        public int? Cancelamentos { get; set; }
        public string? MotivoCancelamento { get; set; }
        public string? Lazer { get; set; }
        public int? LazerIntensidade { get; set; }
        public string? LazerObs { get; set; }
    }
}
