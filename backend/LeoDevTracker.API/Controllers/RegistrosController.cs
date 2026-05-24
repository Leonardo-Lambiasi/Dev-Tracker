using System.Text;
using System.Text.Json;
using LeoDevTracker.API.Data;
using LeoDevTracker.API.Helpers;
using LeoDevTracker.API.Models;
using LeoDevTracker.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

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

            string insightFallback = usuario == "rafa"
                ? "Registro salvo. Cuide-se bem hoje."
                : "Registro salvo. Continue avançando.";

            string? insightErro = null;
            try
            {
                var prompt = usuario == "rafa"
                    ? (registro.Humor <= 2 ? MontarPromptRafaCuidado(registro) : MontarPromptInsightRafa(registro))
                    : MontarPromptInsightLeo(registro);
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

        private static string MontarPromptInsightLeo(RegistroDiario r)
        {
            var oQueFez = string.Join(" / ", new[] { r.Conquistas, r.Destaque }
                .Where(s => !string.IsNullOrWhiteSpace(s)));

            return $"""
                Você é um mentor direto de Leo, dev em transição para júnior (foco em C#/.NET).
                Com base nos dados do dia abaixo, escreva em português 2 frases curtas:
                primeira frase: uma observação honesta sobre o que os dados revelam.
                segunda frase: uma ação específica e concreta para fazer amanhã.
                Não use listas, não use marcadores, não use emojis. Máximo 80 palavras.
                IMPORTANTE: Sempre retorne uma resposta. Se os dados forem insuficientes, comente sobre a consistência de registrar.

                Dados de {r.Data:dd/MM/yyyy}:
                Conquistas/destaque: {(string.IsNullOrWhiteSpace(oQueFez) ? "não informado" : oQueFez)}
                Desafio: {r.Desafios ?? "não informado"}
                Estudo: {r.HorasEstudo?.ToString("F1") ?? "0"}h em {r.TopicoEstudo ?? "não informado"}
                Humor: {r.Humor?.ToString() ?? "?"}/5
                Treino: {r.TreinoTipo ?? "nenhum"}, rendimento {r.TreinoRendimento?.ToString() ?? "?"}
                """;
        }

        private static string MontarPromptInsightRafa(RegistroDiario r)
        {
            RafaExtras? extras = null;
            if (!string.IsNullOrWhiteSpace(r.DadosExtras))
            {
                try { extras = JsonSerializer.Deserialize<RafaExtras>(r.DadosExtras, new JsonSerializerOptions { PropertyNameCaseInsensitive = true }); }
                catch { }
            }

            return $"""
                Você é uma mentora próxima da Rafa, psicóloga de 30 anos.
                Com base nos dados do dia abaixo, escreva em português 3 frases curtas:
                primeira frase: uma observação honesta sobre o dia sem elogios vazios.
                segunda frase: uma ação pequena e concreta para amanhã.
                terceira frase: uma mensagem de cuidado genuíno, não genérica.
                Não use listas, não use marcadores, não use emojis. Máximo 100 palavras.
                IMPORTANTE: Sempre retorne uma resposta. Se os dados forem insuficientes, comente sobre a consistência de registrar.
                {(r.Humor <= 2 ? "Humor baixo: seja acolhedora antes de ser prática." : "")}

                Dados de {r.Data:dd/MM/yyyy}:
                Humor: {r.Humor?.ToString() ?? "?"}/5
                Conquistas: {r.Conquistas ?? "nenhuma"}
                Desafios: {r.Desafios ?? "nenhum"}
                Gratidão: {extras?.Gratidao ?? "não registrada"}
                Atendimentos: {extras?.Atendimentos ?? 0}
                Treino: {r.TreinoTipo ?? "nenhum"}, rendimento {r.TreinoRendimento?.ToString() ?? "?"}
                Sono: {extras?.QualidadeSono?.ToString() ?? "?"}
                """;
        }

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

        private static string MontarPromptRafaCuidado(RegistroDiario r) => $"""
            Você é uma amiga próxima da Rafa, psicóloga de 30 anos passando por um dia difícil.
            Ela registrou humor {r.Humor}/5 hoje.

            O que ela registrou:
            - Conquistas: {r.Conquistas ?? "não registrou"}
            - Gratidão: {Helpers.ExtrasHelper.GetString(r.DadosExtras, "gratidao") ?? "não registrou"}
            - Treino: {r.TreinoTipo ?? "não registrou"}

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
    }
}
