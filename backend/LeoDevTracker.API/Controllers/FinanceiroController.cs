using LeoDevTracker.API.Data;
using LeoDevTracker.API.Helpers;
using LeoDevTracker.API.Models;
using LeoDevTracker.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
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

            var prompt = $$"""
                Você é um assistente financeiro pessoal de {{contexto}}.
                Analise o extrato bancário abaixo e retorne APENAS um objeto JSON válido, sem markdown, sem texto adicional.

                REGRAS CRÍTICAS PARA CLASSIFICAR ENTRADAS E SAÍDAS:
                - "entradas" = SOMENTE valores recebidos/creditados (salário, PIX recebido, depósito, transferência recebida)
                - "saidas" = SOMENTE valores gastos/debitados (compras, pagamentos, PIX enviado, débito automático)
                - NUNCA inclua uma entrada nas saídas, nem uma saída nas entradas
                - Valores com "-", "débito", "debit", "pagamento", "compra" = saída
                - Valores com "+", "crédito", "credit", "recebido", "salário", "depósito" = entrada
                - "saldo" = entradas - saidas (pode ser negativo)
                - Todas as chaves numéricas devem ser positivas (use valor absoluto)

                EXTRATO:
                {{extrato}}

                Retorne exatamente neste formato JSON (sem comentários, sem texto fora do JSON):
                {
                  "resumo": { "entradas": 0.00, "saidas": 0.00, "saldo": 0.00 },
                  "categorias": [
                    { "nome": "Alimentação", "valor": 0.00, "percentual": 0.0 },
                    { "nome": "Transporte", "valor": 0.00, "percentual": 0.0 },
                    { "nome": "Assinatura", "valor": 0.00, "percentual": 0.0 },
                    { "nome": "Lazer", "valor": 0.00, "percentual": 0.0 },
                    { "nome": "Moradia", "valor": 0.00, "percentual": 0.0 },
                    { "nome": "Outros", "valor": 0.00, "percentual": 0.0 }
                  ],
                  "maioresGastos": [
                    { "descricao": "Nome do gasto", "valor": 0.00, "data": "DD/MM" },
                    { "descricao": "Nome do gasto", "valor": 0.00, "data": "DD/MM" },
                    { "descricao": "Nome do gasto", "valor": 0.00, "data": "DD/MM" }
                  ],
                  "padrao": "Padrão de consumo em português (1-2 frases).",
                  "recomendacao": "Recomendação prática em português (1-2 frases).",
                  "dicas": [
                    { "titulo": "Título curto da dica", "texto": "Explicação prática e específica baseada nos dados do extrato.", "prioridade": "alta" },
                    { "titulo": "Título curto da dica", "texto": "Explicação prática e específica baseada nos dados do extrato.", "prioridade": "media" },
                    { "titulo": "Título curto da dica", "texto": "Explicação prática e específica baseada nos dados do extrato.", "prioridade": "baixa" }
                  ]
                }

                REGRAS PARA AS DICAS:
                - Gere entre 2 e 4 dicas baseadas estritamente nos dados do extrato — não invente gastos que não existem
                - "prioridade": "alta" = problema real e urgente (saldo negativo, gasto excessivo em categoria específica)
                - "prioridade": "media" = oportunidade de melhoria clara
                - "prioridade": "baixa" = sugestão de longo prazo (investimento, reserva de emergência)
                - Se o saldo for positivo e sobrar dinheiro, dê uma dica sobre onde aplicar (reserva, investimento)
                - Se houver muitas assinaturas, sugira revisar quais realmente usa
                - Se alimentação/lazer passar de 30% das saídas, alerte com dica de prioridade alta
                - Se as entradas forem irregulares (autônomo), sugira reserva de 3-6 meses de despesas fixas
                - Seja específico: mencione valores e categorias reais do extrato nas dicas
                - Tom: direto, sem julgamento, como um amigo que entende de finanças

                Inclua apenas categorias com valor > 0. percentual = (valor / saidas) * 100. Use ponto para decimais. Retorne SOMENTE o JSON.
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
