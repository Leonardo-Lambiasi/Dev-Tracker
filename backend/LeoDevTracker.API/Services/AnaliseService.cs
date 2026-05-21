using LeoDevTracker.API.Data;
using LeoDevTracker.API.Models;
using Microsoft.EntityFrameworkCore;

namespace LeoDevTracker.API.Services
{
    public class AnaliseService
    {
        private readonly AppDbContext _db;
        private readonly IAiService _ai;

        public AnaliseService(AppDbContext db, IAiService ai)
        {
            _db = db;
            _ai = ai;
        }

        public async Task<AnaliseSemanal> GerarAnaliseSemanal(string usuario)
        {
            var fim = DateTime.UtcNow;
            var inicio = fim.AddDays(-7);
            var inicioAnterior = inicio.AddDays(-7);

            var registros = await _db.RegistrosDiarios
                .Where(r => r.Usuario == usuario && r.Data >= inicio)
                .OrderBy(r => r.Data)
                .ToListAsync();

            var anteriores = await _db.RegistrosDiarios
                .Where(r => r.Usuario == usuario && r.Data >= inicioAnterior && r.Data < inicio)
                .ToListAsync();

            var projetos = await _db.Projetos
                .Where(p => p.Usuario == usuario && p.Status != "concluído")
                .ToListAsync();

            var insightsDaSemana = registros
                .Where(r => !string.IsNullOrWhiteSpace(r.InsightDiario))
                .Select(r => (r.Data, Insight: r.InsightDiario!))
                .ToList();

            var ultimaFinanceira = await _db.AnalisesSemanais
                .Where(a => a.Usuario == usuario && a.Tipo == "financeiro")
                .OrderByDescending(a => a.CriadoEm)
                .FirstOrDefaultAsync();
            var resumoFinanceiro = ultimaFinanceira?.Conteudo is { Length: > 0 } c
                ? c[..Math.Min(300, c.Length)]
                : null;

            var prompt = usuario == "rafa"
                ? MontarPromptRafa(registros, anteriores, projetos, inicio, fim, insightsDaSemana)
                : MontarPromptLeo(registros, anteriores, projetos, inicio, fim, insightsDaSemana, resumoFinanceiro);

            var conteudo = await _ai.Enviar(prompt, AiModelos.Pro, maxTokens: 1200);

            var analise = new AnaliseSemanal
            {
                SemanaInicio = inicio,
                SemanaFim = fim,
                Conteudo = conteudo,
                Tipo = "desenvolvimento",
                Usuario = usuario,
            };

            _db.AnalisesSemanais.Add(analise);
            await _db.SaveChangesAsync();

            return analise;
        }

        // ──────────────────────────────────────────────────────────────────
        // Prompt da Rafa
        // ──────────────────────────────────────────────────────────────────

        private static string MontarPromptRafa(
            List<RegistroDiario> registros,
            List<RegistroDiario> anteriores,
            List<Projeto> projetos,
            DateTime inicio,
            DateTime fim,
            List<(DateTime Data, string Insight)> insightsDaSemana)
        {
            var totalAgua     = registros.Count(r => ExtrasBool(r, "aguaBebida"));
            var totalDieta    = registros.Count(r => ExtrasBool(r, "seguiuDieta"));
            var sonoVals      = registros.Select(r => ExtrasInt(r, "qualidadeSono")).Where(v => v > 0).ToList();
            var sonoMedio     = sonoVals.Count > 0 ? sonoVals.Average() : 0;
            var totalAtend    = registros.Sum(r => ExtrasInt(r, "atendimentos"));
            var totalConteudo = registros.Sum(r => ExtrasInt(r, "conteudoPostado"));
            var gratidoes     = registros.Select(r => ExtrasStr(r, "gratidao")).Where(g => !string.IsNullOrWhiteSpace(g)).ToList();

            var humorList     = registros.Where(r => r.Humor.HasValue).Select(r => (double)r.Humor!.Value).ToList();
            var humorMedio    = humorList.Count > 0 ? humorList.Average() : 0;
            var diasHumorBaixo = humorList.Count(h => h < 3);

            var diasAcademia  = registros.Count(r => r.TreinoTipo == "academia" || r.TreinoTipo == "ambos");
            var diasCaminhada = registros.Count(r => r.TreinoTipo == "caminhada" || r.TreinoTipo == "ambos");
            var conquistasList = registros.Where(r => !string.IsNullOrWhiteSpace(r.Conquistas)).Select(r => r.Conquistas!).ToList();
            var desafiosList   = registros.Where(r => !string.IsNullOrWhiteSpace(r.Desafios)).Select(r => r.Desafios!).ToList();
            var projetosStr    = projetos.Count > 0
                ? string.Join("\n", projetos.Select(p => $"- {p.Nome} ({p.Percentual}%, {p.Status})"))
                : "Nenhum projeto cadastrado.";

            var alertaHumor = diasHumorBaixo >= 3
                ? "ATENÇÃO: 3 ou mais dias com humor abaixo de 3 esta semana. Priorize isso na análise."
                : "Humor estável.";

            return $"""
                Você é uma mentora próxima da Rafa. Analise a semana de {inicio:dd/MM/yyyy} a {fim:dd/MM/yyyy}.

                {PerfilRafa()}

                BEM-ESTAR DA SEMANA:
                - Humor médio: {humorMedio:F1}/5 ({diasHumorBaixo} dias abaixo de 3)
                - Sono médio: {(sonoMedio > 0 ? $"{sonoMedio:F1}/5" : "não informado")}
                - Dias com água completa: {totalAgua}/{registros.Count}
                - Dias seguindo a dieta: {totalDieta}/{registros.Count}
                - {alertaHumor}

                TRABALHO:
                - Total de atendimentos: {totalAtend}
                - Conteúdos postados: {totalConteudo} (meta: 3/semana)

                TREINO:
                - Dias de academia: {diasAcademia}
                - Dias de caminhada: {diasCaminhada}

                REFLEXÕES DA SEMANA:
                - Conquistas: {(conquistasList.Count > 0 ? string.Join("; ", conquistasList) : "nenhuma")}
                - Desafios: {(desafiosList.Count > 0 ? string.Join("; ", desafiosList) : "nenhum")}

                GRATIDÕES DA SEMANA:
                {(gratidoes.Count > 0 ? string.Join("\n", gratidoes.Select(g => $"- {g}")) : "Nenhuma gratidão registrada.")}

                {(insightsDaSemana.Count > 0
                    ? "INSIGHTS DIÁRIOS:\n" + string.Join("\n", insightsDaSemana.Select(i => $"- {i.Data:dd/MM}: {i.Insight}"))
                    : "")}

                PROJETOS:
                {projetosStr}

                GERE:
                1. Uma frase que resume a semana em uma linha
                2. O que foi bem — máximo 3 pontos específicos (inclua treino e bem-estar quando relevante)
                3. O que pode melhorar — máximo 2 pontos com sugestão prática
                {(diasHumorBaixo >= 3 ? "4. Aborde o padrão de humor baixo com cuidado real — ela é psicóloga, pode receber feedback honesto sobre saúde mental. Sugira algo concreto, não genérico." : "4. Um padrão observado ou recomendação para a próxima semana")}
                5. Uma frase de fechamento motivadora mas verdadeira

                Tom: direto, com base nos dados, motivador sem ser condescendente.
                Sem listas com emoji. Máximo 400 palavras.
                """;
        }

        private static string PerfilRafa() => """
            PERFIL:
            - Rafa, 30 anos, psicóloga especialista em TCC
            - Trabalho: atendimentos clínicos, supervisão, estudo contínuo
            - Meta principal: crescer a clínica, equilibrar saúde com trabalho
            - Treino: academia + caminhada, meta 5x/semana
            - Saúde: controla água (meta 2,5L), dieta e sono
            - Produz conteúdo para redes sociais como parte do trabalho
            - Pratica registro de gratidão diário
            - Tende à perda de foco e pensamento excessivo que pode levá-la para baixo
            - Tom desejado: direto, motivador, com base em dados — os três ao mesmo tempo
            """;

        // ──────────────────────────────────────────────────────────────────
        // Prompt do Leo (original)
        // ──────────────────────────────────────────────────────────────────

        private static string MontarPromptLeo(
            List<RegistroDiario> registros,
            List<RegistroDiario> anteriores,
            List<Projeto> projetos,
            DateTime inicio,
            DateTime fim,
            List<(DateTime Data, string Insight)> insightsDaSemana,
            string? resumoFinanceiro)
        {
            var totalHoras       = registros.Sum(r => r.HorasEstudo ?? 0);
            var horasAnterior    = anteriores.Sum(r => r.HorasEstudo ?? 0);
            var topicos          = registros.Where(r => !string.IsNullOrWhiteSpace(r.TopicoEstudo)).Select(r => r.TopicoEstudo!).Distinct().ToList();
            var features         = registros.Sum(r => r.FeaturesRift);
            var bugs             = registros.Sum(r => r.BugsRift);
            var tickets          = registros.Sum(r => r.TicketsTrabalhados ?? 0);
            var horasTrabalhadas = registros.Sum(r => r.HorasTrabalhadas ?? 0);
            var humorList        = registros.Where(r => r.Humor.HasValue).Select(r => (double)r.Humor!.Value).ToList();
            var humorMedio       = humorList.Count != 0 ? humorList.Average() : 0;
            var conquistasList   = registros.Where(r => !string.IsNullOrWhiteSpace(r.Conquistas)).Select(r => r.Conquistas!).ToList();
            var desafiosList     = registros.Where(r => !string.IsNullOrWhiteSpace(r.Desafios)).Select(r => r.Desafios!).ToList();
            var destaques        = registros.Where(r => !string.IsNullOrWhiteSpace(r.Destaque)).Select(r => r.Destaque!).ToList();
            var diasAcademia     = registros.Count(r => r.TreinoTipo == "academia" || r.TreinoTipo == "ambos");
            var diasVolei        = registros.Count(r => r.TreinoTipo == "volei" || r.TreinoTipo == "ambos");
            var rendList         = registros.Where(r => r.TreinoRendimento.HasValue).Select(r => (double)r.TreinoRendimento!.Value).ToList();
            var rendMedio        = rendList.Count != 0 ? rendList.Average() : 0;
            var obsTreino        = registros.Where(r => !string.IsNullOrWhiteSpace(r.TreinoObs)).Select(r => r.TreinoObs!).ToList();
            var projetosStr      = projetos.Count != 0
                ? string.Join("\n", projetos.Select(p => $"- {p.Nome} ({p.Percentual}% concluído, {p.Status})"))
                : "Nenhum projeto em andamento.";

            return $"""
                Você é um mentor de desenvolvimento pessoal e profissional.
                Analise os dados da semana de {inicio:dd/MM/yyyy} a {fim:dd/MM/yyyy} de Leo
                e gere um relatório honesto, direto e útil.

                PERFIL:
                - 26 anos, dev em transição (suporte → júnior) na Rift Sistemas
                - Stack principal: C#/.NET, SQL Server, React
                - Meta de carreira: dev júnior em 6-9 meses, pleno em 3 anos
                - Treina academia 5x por semana e joga vôlei 2x por semana
                - Lida com tendência a desistir sob pressão — prefere feedback
                  que reconhece o esforço sem ser condescendente

                DADOS DA SEMANA:

                Estudos e trabalho:
                - Horas estudadas: {totalHoras:F1}h (semana anterior: {horasAnterior:F1}h)
                - Tópicos estudados: {(topicos.Count != 0 ? string.Join(", ", topicos) : "nenhum")}
                - Features entregues na Rift: {features}
                - Bugs resolvidos: {bugs}
                - Tickets trabalhados: {tickets}
                - Horas trabalhadas: {horasTrabalhadas:F1}h

                Reflexão:
                - Conquistas relatadas: {(conquistasList.Count != 0 ? string.Join("; ", conquistasList) : "nenhuma")}
                - Desafios relatados: {(desafiosList.Count != 0 ? string.Join("; ", desafiosList) : "nenhum")}
                - Destaques relatados: {(destaques.Count != 0 ? string.Join("; ", destaques) : "nenhum")}

                Humor:
                - Humor médio: {humorMedio:F1}/5

                Treino físico:
                - Dias de academia: {diasAcademia} (meta: 5x/semana)
                - Dias de vôlei: {diasVolei} (meta: 2x/semana)
                - Rendimento médio nos treinos: {(rendMedio > 0 ? $"{rendMedio:F1}/5" : "não informado")}
                - Observações de treino: {(obsTreino.Count != 0 ? string.Join("; ", obsTreino) : "nenhuma")}

                Projetos pessoais:
                {projetosStr}

                {(insightsDaSemana.Count != 0
                    ? "INSIGHTS DIÁRIOS DA SEMANA:\n" + string.Join("\n", insightsDaSemana.Select(i => $"- {i.Data:dd/MM}: {i.Insight}"))
                    : "")}

                {(resumoFinanceiro != null ? $"CONTEXTO FINANCEIRO DA SEMANA:\n{resumoFinanceiro}" : "")}

                GERE:
                1. Uma frase de abertura que resume a semana em uma linha
                2. O que foi bem — máximo 3 pontos, específicos (inclua treino se relevante)
                3. O que pode melhorar — máximo 2 pontos, com sugestão prática
                4. Um padrão identificado ao longo das últimas semanas (se houver dados suficientes)
                5. Uma recomendação concreta para a próxima semana
                6. Uma frase de fechamento motivacional mas realista — sem clichê

                Seja direto. Não use listas com emoji. Máximo 400 palavras.
                Quando treino e produtividade estiverem correlacionados nos dados, mencione essa relação explicitamente.
                """;
        }

        // ──────────────────────────────────────────────────────────────────
        // Helpers para leitura do DadosExtras (JSON)
        // ──────────────────────────────────────────────────────────────────

        private static bool ExtrasBool(RegistroDiario r, string key)
        {
            if (string.IsNullOrWhiteSpace(r.DadosExtras)) return false;
            try
            {
                var doc = System.Text.Json.JsonDocument.Parse(r.DadosExtras);
                return doc.RootElement.TryGetProperty(key, out var el) && el.GetBoolean();
            }
            catch { return false; }
        }

        private static int ExtrasInt(RegistroDiario r, string key)
        {
            if (string.IsNullOrWhiteSpace(r.DadosExtras)) return 0;
            try
            {
                var doc = System.Text.Json.JsonDocument.Parse(r.DadosExtras);
                return doc.RootElement.TryGetProperty(key, out var el) ? el.GetInt32() : 0;
            }
            catch { return 0; }
        }

        private static string? ExtrasStr(RegistroDiario r, string key)
        {
            if (string.IsNullOrWhiteSpace(r.DadosExtras)) return null;
            try
            {
                var doc = System.Text.Json.JsonDocument.Parse(r.DadosExtras);
                return doc.RootElement.TryGetProperty(key, out var el) ? el.GetString() : null;
            }
            catch { return null; }
        }
    }
}
