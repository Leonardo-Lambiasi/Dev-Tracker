using LeoDevTracker.API.Data;
using LeoDevTracker.API.Helpers;
using LeoDevTracker.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LeoDevTracker.API.Controllers
{
    [ApiController]
    [Route("api/lazeres")]
    [Authorize]
    public class LazeresController : ControllerBase
    {
        private readonly AppDbContext _db;

        public LazeresController(AppDbContext db) => _db = db;

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var usuario = UsuarioHelper.GetUsuario(User)!;
            var lazeres = await _db.Lazeres
                .Where(l => l.Usuario == usuario)
                .OrderBy(l => l.Nome)
                .ToListAsync();
            return Ok(lazeres);
        }

        [HttpPost]
        public async Task<IActionResult> Create(Lazer lazer)
        {
            var usuario = UsuarioHelper.GetUsuario(User)!;

            var jaExiste = await _db.Lazeres
                .AnyAsync(l => l.Usuario == usuario && l.Nome.ToLower() == lazer.Nome.ToLower());
            if (jaExiste)
                return Conflict(new { error = $"Lazer '{lazer.Nome}' já cadastrado." });

            lazer.Id = Guid.NewGuid();
            lazer.Usuario = usuario;
            lazer.CriadoEm = DateTime.UtcNow;
            _db.Lazeres.Add(lazer);
            await _db.SaveChangesAsync();
            return CreatedAtAction(nameof(GetAll), new { id = lazer.Id }, lazer);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(Guid id, Lazer input)
        {
            var usuario = UsuarioHelper.GetUsuario(User)!;
            var lazer = await _db.Lazeres.FindAsync(id);
            if (lazer == null || lazer.Usuario != usuario) return NotFound();

            lazer.Nome = input.Nome;
            await _db.SaveChangesAsync();
            return Ok(lazer);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            var usuario = UsuarioHelper.GetUsuario(User)!;
            var lazer = await _db.Lazeres.FindAsync(id);
            if (lazer == null || lazer.Usuario != usuario) return NotFound();
            _db.Lazeres.Remove(lazer);
            await _db.SaveChangesAsync();
            return NoContent();
        }
    }
}
