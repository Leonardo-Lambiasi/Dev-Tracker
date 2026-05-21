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

            var prompt = $"""
                Você é um assistente financeiro pessoal de Leo, 26 anos, desenvolvedor em início de carreira no Brasil.
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
                var analise = await _ai.Enviar(prompt, AiModelos.Flash, 1000);

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
