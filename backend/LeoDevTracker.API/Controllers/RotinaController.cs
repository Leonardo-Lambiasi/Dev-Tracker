using LeoDevTracker.API.Data;
using LeoDevTracker.API.Helpers;
using LeoDevTracker.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LeoDevTracker.API.Controllers
{
    [ApiController]
    [Route("api/rotina")]
    [Authorize]
    public class RotinaController : ControllerBase
    {
        private readonly AppDbContext _db;

        public RotinaController(AppDbContext db) => _db = db;

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var usuario = UsuarioHelper.GetUsuario(User)!;
            var slots = await _db.RotinaSlots
                .Where(s => s.Usuario == usuario)
                .OrderBy(s => s.DiaSemana)
                .ThenBy(s => s.Periodo)
                .ToListAsync();
            return Ok(slots);
        }

        [HttpPost]
        public async Task<IActionResult> Create(RotinaSlot slot)
        {
            slot.Id = Guid.NewGuid();
            slot.Usuario = UsuarioHelper.GetUsuario(User)!;
            slot.CriadoEm = DateTime.UtcNow;
            _db.RotinaSlots.Add(slot);
            await _db.SaveChangesAsync();
            return CreatedAtAction(nameof(GetAll), new { id = slot.Id }, slot);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(Guid id, RotinaSlot input)
        {
            var slot = await _db.RotinaSlots.FindAsync(id);
            if (slot == null) return NotFound();
            if (slot.Usuario != UsuarioHelper.GetUsuario(User)) return Forbid();

            slot.DiaSemana = input.DiaSemana;
            slot.Periodo = input.Periodo;
            slot.Label = input.Label;
            slot.Categoria = input.Categoria;
            slot.HoraInicio = input.HoraInicio;
            slot.HoraFim = input.HoraFim;
            await _db.SaveChangesAsync();
            return Ok(slot);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            var slot = await _db.RotinaSlots.FindAsync(id);
            if (slot == null) return NotFound();
            if (slot.Usuario != UsuarioHelper.GetUsuario(User)) return Forbid();
            _db.RotinaSlots.Remove(slot);
            await _db.SaveChangesAsync();
            return NoContent();
        }
    }
}
