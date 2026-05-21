using System;
using System.ComponentModel.DataAnnotations;

namespace LeoDevTracker.API.Models
{
    public class Projeto
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        
        [Required]
        [StringLength(100)]
        public string Nome { get; set; } = string.Empty;
        
        public string? Descricao { get; set; }
        
        [StringLength(200)]
        public string? Stack { get; set; }
        
        [Range(0, 100)]
        public int Percentual { get; set; } = 0;
        
        [StringLength(50)]
        public string? Status { get; set; }

        [StringLength(200)]
        public string? ProximoPasso { get; set; }

        [StringLength(100)]
        public string Usuario { get; set; } = string.Empty;

        public DateTime AtualizadoEm { get; set; } = DateTime.UtcNow;
    }
}