using LeoDevTracker.API.Models;
using Microsoft.EntityFrameworkCore;

namespace LeoDevTracker.API.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        public DbSet<RegistroDiario> RegistrosDiarios => Set<RegistroDiario>();
        public DbSet<Projeto> Projetos => Set<Projeto>();
        public DbSet<MetaFinanceira> MetasFinanceiras => Set<MetaFinanceira>();
        public DbSet<AnaliseSemanal> AnalisesSemanais => Set<AnaliseSemanal>();
        public DbSet<RotinaSlot> RotinaSlots => Set<RotinaSlot>();
        public DbSet<Lazer> Lazeres => Set<Lazer>();
        public DbSet<RotinaCheckin> RotinaCheckins => Set<RotinaCheckin>();

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<RegistroDiario>(e =>
            {
                e.ToTable("registros_diarios");
                e.Property(r => r.CriadoEm).HasDefaultValueSql("NOW()");
                e.Property(r => r.Usuario).HasDefaultValue("leo").HasMaxLength(100);
            });

            modelBuilder.Entity<Projeto>(e =>
            {
                e.ToTable("projetos");
                e.Property(p => p.AtualizadoEm).HasDefaultValueSql("NOW()");
                e.Property(p => p.Usuario).HasDefaultValue("leo").HasMaxLength(100);
            });

            modelBuilder.Entity<MetaFinanceira>(e =>
            {
                e.ToTable("metas_financeiras");
                e.Property(m => m.AtualizadoEm).HasDefaultValueSql("NOW()");
                e.Property(m => m.Usuario).HasDefaultValue("leo").HasMaxLength(100);
            });

            modelBuilder.Entity<AnaliseSemanal>(e =>
            {
                e.ToTable("analises_semanais");
                e.Property(a => a.CriadoEm).HasDefaultValueSql("NOW()");
                e.Property(a => a.Tipo).HasDefaultValue("desenvolvimento").HasMaxLength(30);
                e.Property(a => a.Usuario).HasDefaultValue("leo").HasMaxLength(100);
            });

            modelBuilder.Entity<RotinaSlot>(e =>
            {
                e.ToTable("rotina_slots");
                e.Property(s => s.CriadoEm).HasDefaultValueSql("NOW()");
                e.Property(s => s.IsRecorrente).HasDefaultValue(false);
                e.Property(s => s.DiasRecorrentes).HasColumnType("integer[]");
                e.HasIndex(s => new { s.Usuario, s.DiaSemana });
            });

            modelBuilder.Entity<Lazer>(e =>
            {
                e.ToTable("lazeres");
                e.Property(l => l.CriadoEm).HasDefaultValueSql("NOW()");
                e.Property(l => l.Usuario).HasDefaultValue("rafa").HasMaxLength(100);
                e.HasIndex(l => new { l.Usuario, l.Nome }).IsUnique();
            });

            modelBuilder.Entity<RotinaCheckin>(e =>
            {
                e.ToTable("rotina_checkins");
                e.Property(c => c.CriadoEm).HasDefaultValueSql("NOW()");
                e.Property(c => c.Usuario).HasMaxLength(100);
                e.HasIndex(c => new { c.SlotId, c.Usuario, c.Semana }).IsUnique();
            });
        }
    }
}
