using System;
using System.ComponentModel.DataAnnotations;

namespace LeoDevTracker.API.Models
{
    public class RegistroDiario
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        
        [Required]
        public DateTime Data { get; set; }

        // Estudos
        public decimal? HorasEstudo { get; set; }
        
        [StringLength(200)]
        public string? TopicoEstudo { get; set; }

        // Trabalho (Rift)
        public int FeaturesRift { get; set; } = 0;
        public int BugsRift { get; set; } = 0;
        public int? TicketsTrabalhados { get; set; }
        public decimal? HorasTrabalhadas { get; set; }

        // Bem-estar
        [Range(1, 5)]
        public int? Humor { get; set; }

        public string? Conquistas { get; set; }
        public string? Desafios { get; set; }
        public string? Destaque { get; set; }

        // Treino
        [StringLength(50)]
        public string? TreinoTipo { get; set; }
        
        [Range(1, 5)]
        public int? TreinoRendimento { get; set; }
        
        public string? TreinoObs { get; set; }

        public string? InsightDiario { get; set; }

        // JSON com campos extras por usuário (ex: campos da Rafa)
        public string? DadosExtras { get; set; }

        [StringLength(100)]
        public string Usuario { get; set; } = string.Empty;

        public DateTime CriadoEm { get; set; } = DateTime.UtcNow;
    }
}