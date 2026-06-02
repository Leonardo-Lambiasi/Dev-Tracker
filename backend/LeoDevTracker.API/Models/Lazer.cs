using System.ComponentModel.DataAnnotations;

namespace LeoDevTracker.API.Models
{
    public class Lazer
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        [StringLength(100)]
        public string Usuario { get; set; } = string.Empty;

        [Required]
        [StringLength(100)]
        public string Nome { get; set; } = string.Empty;

        public DateTime CriadoEm { get; set; } = DateTime.UtcNow;
    }
}
