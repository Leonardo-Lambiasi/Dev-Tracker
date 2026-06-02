using System.ComponentModel.DataAnnotations;

namespace LeoDevTracker.API.Models
{
    public class RotinaCheckin
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        public Guid SlotId { get; set; }

        [StringLength(100)]
        public string Usuario { get; set; } = string.Empty;

        public DateTime Semana { get; set; } // Segunda-feira da semana (UTC)

        [Required]
        [StringLength(20)]
        public string Status { get; set; } = string.Empty; // 'feito' | 'nao_feito'

        public DateTime CriadoEm { get; set; } = DateTime.UtcNow;
    }
}
