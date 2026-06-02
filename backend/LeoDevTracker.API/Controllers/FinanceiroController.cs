using LeoDevTracker.API.Data;
using LeoDevTracker.API.Helpers;
using LeoDevTracker.API.Models;
using LeoDevTracker.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using UglyToad.PdfPig;
using UglyToad.PdfPig.Content;

namespace LeoDevTracker.API.Controllers
{
    [ApiController]
    [Route("api/financeiro")]
    [Authorize]
    public class FinanceiroController : ControllerBase
    {
        private readonly IAiService _ai;
        private readonly AppDbContext _db;

        public FinanceiroController(IAiService ai, AppDbContext db)
        {
            _ai = ai;
            _db = db;
        }

        [HttpPost("analisar-extrato")]
        public async Task<IActionResult> AnalisarExtrato([FromBody] ExtratoRequest request)
        {
            var usuario = UsuarioHelper.GetUsuario(User)!;

            if (string.IsNullOrWhiteSpace(request.Extrato))
                return BadRequest(new { error = "O extrato não pode estar vazio." });

            return await Analisar(usuario, request.Extrato);
        }

        [HttpPost("analisar-pdf")]
        [RequestSizeLimit(10 * 1024 * 1024)] // 10 MB
        public async Task<IActionResult> AnalisarPdf(IFormFile arquivo)
        {
            var usuario = UsuarioHelper.GetUsuario(User)!;

            if (arquivo == null || arquivo.Length == 0)
                return BadRequest(new { error = "Nenhum arquivo enviado." });

            if (!arquivo.FileName.EndsWith(".pdf", StringComparison.OrdinalIgnoreCase) &&
                arquivo.ContentType != "application/pdf")
                return BadRequest(new { error = "Apenas arquivos PDF são aceitos." });

            string textoExtraido;
            try
            {
                using var stream = arquivo.OpenReadStream();
                using var ms = new MemoryStream();
                await stream.CopyToAsync(ms);
                textoExtraido = ExtrairTextoPdf(ms.ToArray());
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = $"Não foi possível ler o PDF: {ex.Message}" });
            }

            if (string.IsNullOrWhiteSpace(textoExtraido))
                return BadRequest(new { error = "O PDF não contém texto legível. Tente colar o extrato manualmente." });

            return await Analisar(usuario, textoExtraido);
        }

        private static string ExtrairTextoPdf(byte[] bytes)
        {
            using var pdf = PdfDocument.Open(bytes);
            var sb = new System.Text.StringBuilder();
            foreach (Page page in pdf.GetPages())
            {
                sb.AppendLine(page.Text);
            }
            return sb.ToString();
        }

        private async Task<IActionResult> Analisar(string usuario, string extrato)
        {
            var contexto = usuario == "rafa"
                ? "Rafa, 30 anos, psicóloga autônoma no Brasil"
                : "Leo, 26 anos, desenvolvedor em São Paulo no Brasil";

            var metas = await _db.MetasFinanceiras
                .Where(m => m.Usuario == usuario)
                .ToListAsync();

            var metasBloco = metas.Count > 0
                ? "METAS FINANCEIRAS DO USUARIO:\n" + string.Join("\n", metas.Select(m =>
                {
                    var prog = m.ValorMeta > 0 ? (double)m.ValorAtual / (double)m.ValorMeta * 100 : 0;
                    return $"- {m.Descricao}: atual R$ {m.ValorAtual:F2} / meta R$ {m.ValorMeta:F2} ({prog:F0}%)" +
                           (m.Prazo.HasValue ? $" — prazo {m.Prazo:dd/MM/yyyy}" : "");
                }))
                : "";

            var prompt = $$"""
                Voce e um assistente financeiro pessoal de {{contexto}}.
                Analise o extrato bancario abaixo e retorne APENAS um objeto JSON valido, sem markdown, sem texto adicional.

                REGRAS CRITICAS:
                - "categorias" e "maiores_gastos": use apenas saidas/debitos
                - Valores com "-", "debito", "pagamento", "compra" = saida
                - Valores com "+", "credito", "recebido", "salario", "deposito" = entrada
                - Todas as chaves numericas devem ser positivas (valor absoluto)

                {{metasBloco}}

                EXTRATO:
                {{extrato}}

                Retorne EXATAMENTE neste formato JSON (sem comentarios, sem texto fora do JSON):
                {
                  "resumo": "Sintese em 1-2 frases: entradas vs saidas, saldo e situacao geral",
                  "categorias": [
                    { "nome": "Alimentacao", "valor": 0.00, "percentual": 0.0 }
                  ],
                  "maiores_gastos": [
                    { "descricao": "Nome do gasto", "valor": 0.00 }
                  ],
                  "padrao": "Padrao de consumo identificado (1-2 frases).",
                  "recomendacao": "Recomendacao principal pratica (1-2 frases).",
                  "projecao": "No ritmo atual, fecha o mes com R$ X de sobra/deficit",
                  "acoes_concretas": [
                    "Acao especifica 1 com valor real do extrato",
                    "Acao especifica 2",
                    "Acao especifica 3"
                  ],
                  "alertas": [
                    "Gasto recorrente oculto ou assinatura esquecida",
                    "Padrao de impulso identificado"
                  ],
                  "metas_impacto": [
                    { "meta": "Nome da meta", "observacao": "Como esse extrato impacta essa meta" }
                  ]
                }

                REGRAS:
                - "resumo": string descritiva, nao objeto
                - "maiores_gastos": top 5 maiores saidas individuais
                - "acoes_concretas": exatamente 3 cortes ou realocacoes especificas com valores reais
                - "alertas": gastos recorrentes, assinaturas que podem ter passado despercebidas, padroes de impulso — deixe vazio [] se nao houver
                - "metas_impacto": cruzamento com as metas financeiras do usuario — so inclua se houver metas cadastradas; caso contrario use []
                - percentual = (valor / total_saidas) * 100. Inclua apenas categorias com valor > 0
                - Use ponto para decimais. Retorne SOMENTE o JSON.
                """;

            try
            {
                var analiseRaw = await _ai.Enviar(prompt, AiModelos.Flash, 2000, jsonMode: true);
                var analise = analiseRaw.Replace("```json", "").Replace("```", "").Trim();

                var registro = new AnaliseSemanal
                {
                    SemanaInicio = DateTime.UtcNow.AddDays(-7),
                    SemanaFim = DateTime.UtcNow,
                    Conteudo = analise,
                    Tipo = "financeiro",
                    Usuario = usuario,
                };
                _db.AnalisesSemanais.Add(registro);
                await _db.SaveChangesAsync();

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
