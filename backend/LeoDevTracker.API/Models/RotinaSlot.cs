using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Mvc.ModelBinding;

namespace LeoDevTracker.API.Models
{
    public class RotinaSlot
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        [BindNever]
        [StringLength(100)]
        public string Usuario { get; set; } = string.Empty;

        public int DiaSemana { get; set; } // 0=Dom, 1=Seg ... 6=Sáb

        [Required]
        [StringLength(20)]
        public string Periodo { get; set; } = string.Empty; // 'manha','tarde','noite'

        [Required]
        [StringLength(100)]
        public string Label { get; set; } = string.Empty;

        [Required]
        [StringLength(50)]
        public string Categoria { get; set; } = string.Empty;

        [StringLength(5)]
        public string? HoraInicio { get; set; }

        [StringLength(5)]
        public string? HoraFim { get; set; }

        public DateTime CriadoEm { get; set; } = DateTime.UtcNow;
    }
}
