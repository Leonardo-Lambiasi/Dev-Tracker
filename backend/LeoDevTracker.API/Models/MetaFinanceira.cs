using System;
using System.ComponentModel.DataAnnotations;

namespace LeoDevTracker.API.Models
{
    public class MetaFinanceira
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        
        [StringLength(200)]
        public string? Descricao { get; set; }
        
        [Range(0, double.MaxValue)]
        public decimal ValorMeta { get; set; }
        
        public decimal ValorAtual { get; set; } = 0;
        
        public DateTime? Prazo { get; set; }

        [StringLength(100)]
        public string Usuario { get; set; } = string.Empty;

        public DateTime AtualizadoEm { get; set; } = DateTime.UtcNow;
    }
}