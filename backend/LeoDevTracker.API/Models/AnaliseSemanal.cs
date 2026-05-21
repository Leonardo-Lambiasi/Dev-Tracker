using System;
using System.ComponentModel.DataAnnotations;

namespace LeoDevTracker.API.Models
{
    public class AnaliseSemanal
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        
        [Required]
        public DateTime SemanaInicio { get; set; }
        
        [Required]
        public DateTime SemanaFim { get; set; }
        
        public string? Conteudo { get; set; }

        [StringLength(30)]
        public string? Tipo { get; set; } = "desenvolvimento";

        [StringLength(100)]
        public string Usuario { get; set; } = string.Empty;

        public DateTime CriadoEm { get; set; } = DateTime.UtcNow;
    }
}