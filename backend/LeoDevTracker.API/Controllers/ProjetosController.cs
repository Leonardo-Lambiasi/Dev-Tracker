using LeoDevTracker.API.Data;
using LeoDevTracker.API.Helpers;
using LeoDevTracker.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LeoDevTracker.API.Controllers
{
    [ApiController]
    [Route("api/projetos")]
    [Authorize]
    public class ProjetosController : ControllerBase
    {
        private readonly AppDbContext _db;

        public ProjetosController(AppDbContext db) => _db = db;

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var usuario = UsuarioHelper.GetUsuario(User)!;
            return Ok(await _db.Projetos
                .Where(p => p.Usuario == usuario)
                .OrderBy(p => p.Nome)
                .ToListAsync());
        }

        [HttpPost]
        public async Task<IActionResult> Create(Projeto projeto)
        {
            var usuario = UsuarioHelper.GetUsuario(User)!;
            projeto.Id = Guid.NewGuid();
            projeto.Usuario = usuario;
            projeto.AtualizadoEm = DateTime.UtcNow;
            _db.Projetos.Add(projeto);
            await _db.SaveChangesAsync();
            return CreatedAtAction(nameof(GetAll), new { id = projeto.Id }, projeto);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(Guid id, Projeto input)
        {
            var usuario = UsuarioHelper.GetUsuario(User)!;
            var projeto = await _db.Projetos.FindAsync(id);
            if (projeto == null || projeto.Usuario != usuario) return NotFound();

            projeto.Nome = input.Nome;
            projeto.Descricao = input.Descricao;
            projeto.Stack = input.Stack;
            projeto.Percentual = input.Percentual;
            projeto.Status = input.Status;
            projeto.ProximoPasso = input.ProximoPasso;
            projeto.AtualizadoEm = DateTime.UtcNow;

            await _db.SaveChangesAsync();
            return Ok(projeto);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            var usuario = UsuarioHelper.GetUsuario(User)!;
            var projeto = await _db.Projetos.FindAsync(id);
            if (projeto == null || projeto.Usuario != usuario) return NotFound();
            _db.Projetos.Remove(projeto);
            await _db.SaveChangesAsync();
            return NoContent();
        }
    }
}
