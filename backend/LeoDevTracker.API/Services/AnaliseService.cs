using LeoDevTracker.API.Data;
using LeoDevTracker.API.Helpers;
using LeoDevTracker.API.Models;
using Microsoft.EntityFrameworkCore;

namespace LeoDevTracker.API.Services
{
    public class AnaliseService
    {
        private readonly AppDbContext _db;
        private readonly IAiService _ai;
        private readonly ILogger<AnaliseService> _logger;

        public AnaliseService(AppDbContext db, IAiService ai, ILogger<AnaliseService> logger)
        {
            _db = db;
            _ai = ai;
            _logger = logger;
        }

        public async Task<AnaliseSemanal> GerarAnaliseSemanal(string usuario)
        {
            // Intervalo dinâmico: desde a última análise de desenvolvimento gerada
            var ultimaAnalise = await _db.AnalisesSemanais
                .Where(a => a.Usuario == usuario && a.Tipo == "desenvolvimento")
                .OrderByDescending(a => a.CriadoEm)
                .FirstOrDefaultAsync();

            var fim = DateTime.UtcNow;
            var inicio = ultimaAnalise != null && (fim - ultimaAnalise.SemanaFim).TotalHours >= 12
                ? ultimaAnalise.SemanaFim
                : fim.AddDays(-7);

            var periodoDias = Math.Max((fim - inicio).TotalDays, 1);
            var inicioAnterior = inicio.AddDays(-periodoDias);

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

            // Aderência à rotina (só para Rafa)
            (double? aderenciaSemana, double? aderenciaAnterior) = (null, null);
            if (usuario == "rafa")
            {
                var segundaAtual = GetSegunda(inicio);
                var segundaAnterior = GetSegunda(inicioAnterior);

                var checkinsSemana = await _db.RotinaCheckins
                    .Where(c => c.Usuario == usuario && c.Semana.Date == segundaAtual.Date)
                    .ToListAsync();
                var checkinsAnterior = await _db.RotinaCheckins
                    .Where(c => c.Usuario == usuario && c.Semana.Date == segundaAnterior.Date)
                    .ToListAsync();

                aderenciaSemana = CalcAderencia(checkinsSemana);
                aderenciaAnterior = CalcAderencia(checkinsAnterior);
            }

            var insightsDaSemana = registros
                .Where(r => !string.IsNullOrWhiteSpace(r.InsightDiario))
                .Select(r => (r.Data, Insight: r.InsightDiario!))
                .ToList();

            var ultimaFinanceira = await _db.AnalisesSemanais
                .Where(a => a.Usuario == usuario && a.Tipo == "financeiro")
                .OrderByDescending(a => a.CriadoEm)
                .FirstOrDefaultAsync();
            var resumoFinanceiro = ultimaFinanceira?.Conteudo is { Length: > 0 } c
                ? c[..Math.Min(400, c.Length)]
                : null;

            List<MetaFinanceira> metas = [];
            if (usuario != "rafa")
            {
                metas = await _db.MetasFinanceiras
                    .Where(m => m.Usuario == usuario)
                    .ToListAsync();
            }

            var prompt = usuario == "rafa"
                ? MontarPromptRafa(registros, anteriores, projetos, inicio, fim, insightsDaSemana, aderenciaSemana, aderenciaAnterior, ultimaAnalise)
                : MontarPromptLeo(registros, anteriores, projetos, inicio, fim, insightsDaSemana, resumoFinanceiro, metas, ultimaAnalise);

            _logger.LogInformation("GerarAnaliseSemanal: chamando Gemini para {Usuario}, registros={Count}", usuario, registros.Count);
            var conteudo = await _ai.Enviar(prompt, AiModelos.Flash, maxTokens: 1200, thinkingBudget: 2048);
            _logger.LogInformation("GerarAnaliseSemanal: Gemini respondeu {Chars} chars para {Usuario}", conteudo?.Length ?? 0, usuario);

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
            List<(DateTime Data, string Insight)> insightsDaSemana,
            double? aderenciaSemana,
            double? aderenciaAnterior,
            AnaliseSemanal? ultimaAnalise)
        {
            var sonoVals       = registros.Select(r => ExtrasHelper.GetInt(r.DadosExtras, "qualidadeSono")).Where(v => v > 0).ToList();
            var sonoMedio      = sonoVals.Count > 0 ? sonoVals.Average() : 0;
            var sonoAnt        = anteriores.Select(r => ExtrasHelper.GetInt(r.DadosExtras, "qualidadeSono")).Where(v => v > 0).ToList();
            var sonoMedioAnt   = sonoAnt.Count > 0 ? sonoAnt.Average() : 0;

            var totalAtend     = registros.Sum(r => ExtrasHelper.GetInt(r.DadosExtras, "atendimentos"));
            var totalAtendAnt  = anteriores.Sum(r => ExtrasHelper.GetInt(r.DadosExtras, "atendimentos"));
            var totalConteudo  = registros.Sum(r => ExtrasHelper.GetInt(r.DadosExtras, "conteudoPostado"));
            var totalCancelam  = registros.Sum(r => ExtrasHelper.GetInt(r.DadosExtras, "cancelamentos"));
            var gratidoes      = registros.Select(r => ExtrasHelper.GetString(r.DadosExtras, "gratidao")).Where(g => !string.IsNullOrWhiteSpace(g)).ToList();

            var lazeresMap = new Dictionary<string, List<int>>();
            foreach (var r in registros)
            {
                var lazer = ExtrasHelper.GetString(r.DadosExtras, "lazer");
                var intensidade = ExtrasHelper.GetInt(r.DadosExtras, "lazerIntensidade");
                if (!string.IsNullOrWhiteSpace(lazer) && intensidade > 0)
                {
                    if (!lazeresMap.ContainsKey(lazer)) lazeresMap[lazer] = [];
                    lazeresMap[lazer].Add(intensidade);
                }
            }
            var diasComLazer = registros.Count(r => !string.IsNullOrWhiteSpace(ExtrasHelper.GetString(r.DadosExtras, "lazer")));

            var humorList      = registros.Where(r => r.Humor.HasValue).Select(r => (double)r.Humor!.Value).ToList();
            var humorMedio     = humorList.Count > 0 ? humorList.Average() : 0;
            var humorListAnt   = anteriores.Where(r => r.Humor.HasValue).Select(r => (double)r.Humor!.Value).ToList();
            var humorMedioAnt  = humorListAnt.Count > 0 ? humorListAnt.Average() : 0;
            var diasHumorBaixo = humorList.Count(h => h < 3);

            var diasAcademia   = registros.Count(r => r.TreinoTipo == "academia" || r.TreinoTipo == "ambos");
            var diasCaminhada  = registros.Count(r => r.TreinoTipo == "caminhada/corrida" || r.TreinoTipo == "ambos");
            var diasBike       = registros.Count(r => r.TreinoTipo == "bike");
            var diasAcademiaAnt = anteriores.Count(r => r.TreinoTipo == "academia" || r.TreinoTipo == "ambos");

            var conquistasList = registros.Where(r => !string.IsNullOrWhiteSpace(r.Conquistas)).Select(r => r.Conquistas!).ToList();
            var desafiosList   = registros.Where(r => !string.IsNullOrWhiteSpace(r.Desafios)).Select(r => r.Desafios!).ToList();

            var alertaHumor3Dias = diasHumorBaixo >= 3
                ? $"ALERTA CRITICO: {diasHumorBaixo} dias com humor < 3 neste periodo. Aborde com cuidado real na secao Padroes Preocupantes."
                : "";

            var modoCuidado = diasHumorBaixo >= 2
                ? $"SEMANA DIFICIL ({diasHumorBaixo} dias humor ≤ 2): Comece reconhecendo o esforco. Nao abra com metas. Mencione algo concreto que ela fez bem. Tom: parceira que se importa."
                : "";

            var lazeresBloco = lazeresMap.Count > 0
                ? "Lazer: " + string.Join("; ", lazeresMap.Select(kv => $"{kv.Key} ({kv.Value.Average():F1}/5)")) + $" — {diasComLazer} dias"
                : "Lazer: nenhum registrado" + (diasComLazer < 3 ? " (poucos dias — lazer protegido e parte das metas)" : "");

            var aderenciaBloco = aderenciaSemana.HasValue
                ? $"Aderencia a rotina: {aderenciaSemana:F0}%{(aderenciaAnterior.HasValue ? $" (periodo anterior: {aderenciaAnterior:F0}%)" : "")}"
                : "Aderencia a rotina: sem dados de checkin";

            var comparacaoBloco = anteriores.Count > 0 ? $"""
                COMPARACAO COM PERIODO ANTERIOR ({inicioAnterior(inicio, fim):dd/MM} a {inicio:dd/MM}):
                - Humor medio: {humorMedioAnt:F1}/5 → agora {humorMedio:F1}/5
                - Sono medio: {(sonoMedioAnt > 0 ? $"{sonoMedioAnt:F1}/5" : "sem dados")} → agora {(sonoMedio > 0 ? $"{sonoMedio:F1}/5" : "sem dados")}
                - Atendimentos: {totalAtendAnt} → agora {totalAtend}
                - Academia: {diasAcademiaAnt}x → agora {diasAcademia}x
                """ : "COMPARACAO: sem dados do periodo anterior.";

            var contextoUltimaAnalise = ultimaAnalise?.Conteudo is { Length: > 50 } prev
                ? $"CONTEXTO DA ULTIMA ANALISE (referencia para comparacao):\n{prev[..Math.Min(400, prev.Length)]}"
                : "";

            return $"""
                Voce e uma mentora proxima da Rafa. Analise o periodo de {inicio:dd/MM/yyyy} a {fim:dd/MM/yyyy} ({registros.Count} dias registrados).
                {modoCuidado}
                {alertaHumor3Dias}

                {PerfilRafa()}

                BEM-ESTAR:
                - Humor medio: {humorMedio:F1}/5 ({diasHumorBaixo} dias abaixo de 3)
                - Sono medio: {(sonoMedio > 0 ? $"{sonoMedio:F1}/5" : "nao informado")}
                - {lazeresBloco}

                TRABALHO:
                - Atendimentos: {totalAtend} | Cancelamentos: {totalCancelam}{(totalCancelam > 0 ? " (verifique impacto)" : "")}
                - Conteudos postados: {totalConteudo} (meta: 3/semana)

                TREINO:
                - Academia: {diasAcademia}x | Caminhada/corrida: {diasCaminhada}x | Bike: {diasBike}x

                {aderenciaBloco}

                {comparacaoBloco}

                REFLEXOES:
                - Conquistas: {(conquistasList.Count > 0 ? string.Join("; ", conquistasList) : "nenhuma registrada")}
                - Desafios: {(desafiosList.Count > 0 ? string.Join("; ", desafiosList) : "nenhum registrado")}
                - Gratidoes ({gratidoes.Count}): {(gratidoes.Count > 0 ? string.Join("; ", gratidoes.Take(5)) : "nenhuma")}

                {(insightsDaSemana.Count > 0 ? "INSIGHTS DIARIOS:\n" + string.Join("\n", insightsDaSemana.Select(i => $"- {i.Data:dd/MM}: {i.Insight}")) : "")}

                {contextoUltimaAnalise}

                GERE uma analise estruturada em exatamente 4 secoes com esses titulos:
                Visao Geral
                Destaques
                Padroes Preocupantes
                Foco para o Proximo Periodo

                Tom: acolhedor mas honesto, com base nos dados. Sem emojis. Maximo 400 palavras.
                Se houver alerta de humor baixo, nao ignore — trate com cuidado genuino na secao Padroes Preocupantes.
                """;
        }

        private static DateTime inicioAnterior(DateTime inicio, DateTime fim)
        {
            var dur = (fim - inicio).TotalDays;
            return inicio.AddDays(-dur);
        }

        private static string PerfilRafa() => """
            PERFIL:
            - Rafa, 30 anos, psicóloga especialista em TCC
            - Trabalho: atendimentos clínicos, supervisão, estudo contínuo
            - Meta principal: crescer a clínica, equilibrar saúde com trabalho
            - Treino: academia (meta 3x/semana), caminhada/corrida (meta 2x/semana), bike quando possível
            - Saúde: controla sono e bem-estar geral
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
            string? resumoFinanceiro,
            List<MetaFinanceira> metas,
            AnaliseSemanal? ultimaAnalise)
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
            var humorAnt         = anteriores.Where(r => r.Humor.HasValue).Select(r => (double)r.Humor!.Value).ToList();
            var humorMedioAnt    = humorAnt.Count != 0 ? humorAnt.Average() : 0;
            var conquistasList   = registros.Where(r => !string.IsNullOrWhiteSpace(r.Conquistas)).Select(r => r.Conquistas!).ToList();
            var desafiosList     = registros.Where(r => !string.IsNullOrWhiteSpace(r.Desafios)).Select(r => r.Desafios!).ToList();
            var destaques        = registros.Where(r => !string.IsNullOrWhiteSpace(r.Destaque)).Select(r => r.Destaque!).ToList();
            var diasAcademia     = registros.Count(r => r.TreinoTipo == "academia" || r.TreinoTipo == "ambos");
            var diasVolei        = registros.Count(r => r.TreinoTipo == "volei" || r.TreinoTipo == "ambos");
            var diasAcademiaAnt  = anteriores.Count(r => r.TreinoTipo == "academia" || r.TreinoTipo == "ambos");
            var rendList         = registros.Where(r => r.TreinoRendimento.HasValue).Select(r => (double)r.TreinoRendimento!.Value).ToList();
            var rendMedio        = rendList.Count != 0 ? rendList.Average() : 0;
            var projetosStr      = projetos.Count != 0
                ? string.Join("\n", projetos.Select(p =>
                    $"- {p.Nome}: {p.Percentual}%{(p.ProximoPasso != null ? $" → proximo: {p.ProximoPasso}" : "")} ({p.Status})"))
                : "Nenhum projeto em andamento.";

            var metasBloco = metas.Count > 0
                ? "METAS FINANCEIRAS:\n" + string.Join("\n", metas.Select(m =>
                {
                    var prog = m.ValorMeta > 0 ? (double)m.ValorAtual / (double)m.ValorMeta * 100 : 0;
                    return $"- {m.Descricao}: R$ {m.ValorAtual:F0} / R$ {m.ValorMeta:F0} ({prog:F0}%)" +
                           (m.Prazo.HasValue ? $" — prazo {m.Prazo:dd/MM/yyyy}" : "");
                }))
                : "METAS FINANCEIRAS: nenhuma cadastrada.";

            var comparacaoBloco = anteriores.Count > 0 ? $"""
                COMPARACAO COM PERIODO ANTERIOR ({inicioAnterior(inicio, fim):dd/MM} a {inicio:dd/MM}):
                - Horas de estudo: {horasAnterior:F1}h → agora {totalHoras:F1}h
                - Humor medio: {humorMedioAnt:F1}/5 → agora {humorMedio:F1}/5
                - Academia: {diasAcademiaAnt}x → agora {diasAcademia}x
                """ : "COMPARACAO: sem dados do periodo anterior.";

            var contextoUltimaAnalise = ultimaAnalise?.Conteudo is { Length: > 50 } prev
                ? $"CONTEXTO DA ULTIMA ANALISE (para verificar progresso):\n{prev[..Math.Min(400, prev.Length)]}"
                : "";

            return $"""
                Voce e um mentor de desenvolvimento pessoal e profissional de Leo.
                Analise o periodo de {inicio:dd/MM/yyyy} a {fim:dd/MM/yyyy} ({registros.Count} dias registrados).

                PERFIL:
                - 26 anos, dev em transicao (suporte → junior) na Rift Sistemas
                - Stack: C#/.NET, SQL Server, React
                - Meta: dev junior em 6-9 meses, pleno em 3 anos
                - Treina academia 5x/semana, volei 2x/semana
                - Tendencia a desistir sob pressao — quer feedback honesto, nao condescendente

                ESTUDOS E TRABALHO:
                - Horas estudadas: {totalHoras:F1}h | Topicos: {(topicos.Count != 0 ? string.Join(", ", topicos) : "nenhum")}
                - Rift: {features} feat, {bugs} bugs, {tickets} tickets, {horasTrabalhadas:F1}h trabalhadas

                HUMOR: medio {humorMedio:F1}/5

                TREINO:
                - Academia: {diasAcademia}x (meta 5x) | Volei: {diasVolei}x (meta 2x)
                - Rendimento medio: {(rendMedio > 0 ? $"{rendMedio:F1}/5" : "nao informado")}

                REFLEXOES:
                - Conquistas: {(conquistasList.Count != 0 ? string.Join("; ", conquistasList) : "nenhuma")}
                - Desafios: {(desafiosList.Count != 0 ? string.Join("; ", desafiosList) : "nenhum")}
                - Destaques: {(destaques.Count != 0 ? string.Join("; ", destaques) : "nenhum")}

                PROJETOS ATIVOS:
                {projetosStr}

                {metasBloco}

                {comparacaoBloco}

                {(insightsDaSemana.Count != 0 ? "INSIGHTS DIARIOS:\n" + string.Join("\n", insightsDaSemana.Select(i => $"- {i.Data:dd/MM}: {i.Insight}")) : "")}

                {contextoUltimaAnalise}

                {(resumoFinanceiro != null ? $"CONTEXTO FINANCEIRO:\n{resumoFinanceiro}" : "")}

                GERE uma analise estruturada em exatamente 4 secoes com esses titulos:
                Visao Geral
                Destaques
                Padroes Preocupantes
                Foco para o Proximo Periodo

                Seja direto. Sem emojis. Maximo 400 palavras.
                Se treino e produtividade estiverem correlacionados nos dados, mencione explicitamente.
                Se metas financeiras estiverem estagnadas, mencione em Padroes Preocupantes.
                """;
        }

        private static DateTime GetSegunda(DateTime data)
        {
            var dia = data.DayOfWeek;
            var diff = dia == DayOfWeek.Sunday ? -6 : -(int)dia + 1;
            return data.AddDays(diff).Date;
        }

        private static double? CalcAderencia(List<RotinaCheckin> checkins)
        {
            var feitos = checkins.Count(c => c.Status == "feito");
            var naoFeitos = checkins.Count(c => c.Status == "nao_feito");
            var total = feitos + naoFeitos;
            return total > 0 ? Math.Round((double)feitos / total * 100, 1) : null;
        }
    }
}
