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

            var resultado = slots.Select(s => ToDto(s)).ToList();

            // Expandir slots recorrentes: injetar cópias virtuais nos dias sem slot manual
            var diasPeriodoReais = new HashSet<(int, string)>(slots.Select(s => (s.DiaSemana, s.Periodo)));

            foreach (var slot in slots.Where(s => s.IsRecorrente && s.DiasRecorrentes?.Length > 0))
            {
                foreach (var dia in slot.DiasRecorrentes!)
                {
                    if (dia == slot.DiaSemana) continue;
                    if (diasPeriodoReais.Contains((dia, slot.Periodo))) continue;

                    resultado.Add(new RotinaSlotDto
                    {
                        Id = Guid.NewGuid(),
                        Usuario = slot.Usuario,
                        DiaSemana = dia,
                        Periodo = slot.Periodo,
                        Label = slot.Label,
                        Categoria = slot.Categoria,
                        HoraInicio = slot.HoraInicio,
                        HoraFim = slot.HoraFim,
                        CriadoEm = slot.CriadoEm,
                        IsRecorrente = true,
                        DiasRecorrentes = slot.DiasRecorrentes,
                        IsVirtual = true,
                        RecorrenteOriginalId = slot.Id,
                    });
                }
            }

            return Ok(resultado.OrderBy(s => s.DiaSemana).ThenBy(s => s.Periodo));
        }

        private static RotinaSlotDto ToDto(RotinaSlot s) => new()
        {
            Id = s.Id,
            Usuario = s.Usuario,
            DiaSemana = s.DiaSemana,
            Periodo = s.Periodo,
            Label = s.Label,
            Categoria = s.Categoria,
            HoraInicio = s.HoraInicio,
            HoraFim = s.HoraFim,
            CriadoEm = s.CriadoEm,
            IsRecorrente = s.IsRecorrente,
            DiasRecorrentes = s.DiasRecorrentes,
            IsVirtual = false,
            RecorrenteOriginalId = null,
        };

        [HttpPost]
        public async Task<IActionResult> Create(RotinaSlot slot)
        {
            slot.Id = Guid.NewGuid();
            slot.Usuario = UsuarioHelper.GetUsuario(User)!;
            slot.CriadoEm = DateTime.UtcNow;
            _db.RotinaSlots.Add(slot);
            await _db.SaveChangesAsync();
            return CreatedAtAction(nameof(GetAll), new { id = slot.Id }, ToDto(slot));
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
            slot.IsRecorrente = input.IsRecorrente;
            slot.DiasRecorrentes = input.IsRecorrente ? input.DiasRecorrentes : null;
            await _db.SaveChangesAsync();
            return Ok(ToDto(slot));
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

        // ── Checkins de aderência ──────────────────────────────────────────

        [HttpGet("checkins")]
        public async Task<IActionResult> GetCheckins([FromQuery] string semana)
        {
            var usuario = UsuarioHelper.GetUsuario(User)!;
            if (!DateTime.TryParse(semana, out var semanaDate))
                return BadRequest(new { error = "Parâmetro 'semana' inválido. Use formato YYYY-MM-DD." });

            var checkins = await _db.RotinaCheckins
                .Where(c => c.Usuario == usuario && c.Semana.Date == semanaDate.Date)
                .ToListAsync();
            return Ok(checkins);
        }

        [HttpPut("{slotId}/checkin")]
        public async Task<IActionResult> UpsertCheckin(Guid slotId, [FromBody] CheckinRequest request)
        {
            var usuario = UsuarioHelper.GetUsuario(User)!;

            var slot = await _db.RotinaSlots.FindAsync(slotId);
            if (slot == null || slot.Usuario != usuario) return NotFound();

            if (!DateTime.TryParse(request.Semana, out var semanaDate))
                return BadRequest(new { error = "Campo 'semana' inválido." });

            var checkin = await _db.RotinaCheckins
                .FirstOrDefaultAsync(c => c.SlotId == slotId && c.Usuario == usuario && c.Semana.Date == semanaDate.Date);

            if (string.IsNullOrWhiteSpace(request.Status))
            {
                if (checkin != null)
                {
                    _db.RotinaCheckins.Remove(checkin);
                    await _db.SaveChangesAsync();
                }
                return NoContent();
            }

            if (request.Status != "feito" && request.Status != "nao_feito")
                return BadRequest(new { error = "Status deve ser 'feito' ou 'nao_feito'." });

            if (checkin == null)
            {
                checkin = new RotinaCheckin
                {
                    Id = Guid.NewGuid(),
                    SlotId = slotId,
                    Usuario = usuario,
                    Semana = semanaDate.Date,
                    Status = request.Status,
                    CriadoEm = DateTime.UtcNow,
                };
                _db.RotinaCheckins.Add(checkin);
            }
            else
            {
                checkin.Status = request.Status;
            }

            await _db.SaveChangesAsync();
            return Ok(checkin);
        }

        [HttpGet("aderencia")]
        public async Task<IActionResult> GetAderencia([FromQuery] int semanas = 4)
        {
            var usuario = UsuarioHelper.GetUsuario(User)!;
            var segundaHoje = GetSegunda(DateTime.UtcNow);

            var semanasList = Enumerable.Range(0, semanas)
                .Select(i => segundaHoje.AddDays(-7 * i))
                .Reverse()
                .ToList();

            var checkins = await _db.RotinaCheckins
                .Where(c => c.Usuario == usuario && semanasList.Contains(c.Semana.Date))
                .ToListAsync();

            var result = semanasList.Select(sem =>
            {
                var cs = checkins.Where(c => c.Semana.Date == sem.Date).ToList();
                var feitos = cs.Count(c => c.Status == "feito");
                var naoFeitos = cs.Count(c => c.Status == "nao_feito");
                var total = feitos + naoFeitos;
                return new
                {
                    semana = sem.ToString("yyyy-MM-dd"),
                    feitos,
                    naoFeitos,
                    aderencia = total > 0 ? (double?)Math.Round((double)feitos / total * 100, 1) : null,
                };
            });

            return Ok(result);
        }

        private static DateTime GetSegunda(DateTime data)
        {
            var dia = data.DayOfWeek;
            var diff = dia == DayOfWeek.Sunday ? -6 : -(int)dia + 1;
            return data.AddDays(diff).Date;
        }
    }

    public record CheckinRequest(string Semana, string? Status);

    public class RotinaSlotDto
    {
        public Guid Id { get; set; }
        public string Usuario { get; set; } = string.Empty;
        public int DiaSemana { get; set; }
        public string Periodo { get; set; } = string.Empty;
        public string Label { get; set; } = string.Empty;
        public string Categoria { get; set; } = string.Empty;
        public string? HoraInicio { get; set; }
        public string? HoraFim { get; set; }
        public DateTime CriadoEm { get; set; }
        public bool IsRecorrente { get; set; }
        public int[]? DiasRecorrentes { get; set; }
        public bool IsVirtual { get; set; }
        public Guid? RecorrenteOriginalId { get; set; }
    }
}
