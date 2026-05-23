using LeoDevTracker.API.Data;
using LeoDevTracker.API.Helpers;
using LeoDevTracker.API.Models;
using LeoDevTracker.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

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

            var extrato = request.Extrato;
            var prompt = $$"""
                Analise o extrato bancário abaixo e retorne APENAS um objeto JSON válido, sem markdown, sem texto adicional.

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
                  "recomendacao": "Recomendação prática em português (1-2 frases)."
                }

                Inclua apenas categorias com valor > 0. Use ponto para decimais. Retorne SOMENTE o JSON.
                """;

            try
            {
                var analiseRaw = await _ai.Enviar(prompt, AiModelos.Flash, 1500, jsonMode: true);
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
