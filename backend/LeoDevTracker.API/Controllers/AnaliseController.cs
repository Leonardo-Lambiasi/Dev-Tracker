using LeoDevTracker.API.Data;
using LeoDevTracker.API.Helpers;
using LeoDevTracker.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LeoDevTracker.API.Controllers
{
    [ApiController]
    [Route("api/analise")]
    [Authorize]
    public class AnaliseController : ControllerBase
    {
        private readonly AppDbContext _db;

        public AnaliseController(AppDbContext db) => _db = db;

        [HttpPost("gerar")]
        public async Task<IActionResult> Gerar([FromServices] AnaliseService analiseService)
        {
            var usuario = UsuarioHelper.GetUsuario(User)!;
            try
            {
                var analise = await analiseService.GerarAnaliseSemanal(usuario);
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
            var usuario = UsuarioHelper.GetUsuario(User)!;
            var analise = await _db.AnalisesSemanais
                .Where(a => a.Usuario == usuario && (a.Tipo == "desenvolvimento" || a.Tipo == null))
                .OrderByDescending(a => a.CriadoEm)
                .FirstOrDefaultAsync();
            return analise == null ? NotFound() : Ok(analise);
        }

        [HttpGet("historico")]
        public async Task<IActionResult> GetHistorico([FromQuery] string? tipo = null)
        {
            var usuario = UsuarioHelper.GetUsuario(User)!;
            var query = _db.AnalisesSemanais.Where(a => a.Usuario == usuario);
            if (!string.IsNullOrWhiteSpace(tipo))
                query = query.Where(a => a.Tipo == tipo);
            return Ok(await query.OrderByDescending(a => a.CriadoEm).ToListAsync());
        }
    }
}
