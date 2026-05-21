using LeoDevTracker.API.Data;
using LeoDevTracker.API.Helpers;
using LeoDevTracker.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LeoDevTracker.API.Controllers
{
    [ApiController]
    [Route("api/metas")]
    [Authorize]
    public class MetasController : ControllerBase
    {
        private readonly AppDbContext _db;

        public MetasController(AppDbContext db) => _db = db;

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var usuario = UsuarioHelper.GetUsuario(User)!;
            return Ok(await _db.MetasFinanceiras
                .Where(m => m.Usuario == usuario)
                .OrderBy(m => m.Prazo)
                .ToListAsync());
        }

        [HttpPost]
        public async Task<IActionResult> Create(MetaFinanceira meta)
        {
            var usuario = UsuarioHelper.GetUsuario(User)!;
            meta.Id = Guid.NewGuid();
            meta.Usuario = usuario;
            meta.AtualizadoEm = DateTime.UtcNow;
            _db.MetasFinanceiras.Add(meta);
            await _db.SaveChangesAsync();
            return CreatedAtAction(nameof(GetAll), new { id = meta.Id }, meta);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(Guid id, MetaFinanceira input)
        {
            var usuario = UsuarioHelper.GetUsuario(User)!;
            var meta = await _db.MetasFinanceiras.FindAsync(id);
            if (meta == null || meta.Usuario != usuario) return NotFound();

            meta.Descricao = input.Descricao;
            meta.ValorMeta = input.ValorMeta;
            meta.ValorAtual = input.ValorAtual;
            meta.Prazo = input.Prazo;
            meta.AtualizadoEm = DateTime.UtcNow;

            await _db.SaveChangesAsync();
            return Ok(meta);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            var usuario = UsuarioHelper.GetUsuario(User)!;
            var meta = await _db.MetasFinanceiras.FindAsync(id);
            if (meta == null || meta.Usuario != usuario) return NotFound();
            _db.MetasFinanceiras.Remove(meta);
            await _db.SaveChangesAsync();
            return NoContent();
        }
    }
}
