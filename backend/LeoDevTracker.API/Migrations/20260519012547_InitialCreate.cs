using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LeoDevTracker.API.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "analises_semanais",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SemanaInicio = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    SemanaFim = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Conteudo = table.Column<string>(type: "text", nullable: true),
                    CriadoEm = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_analises_semanais", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "metas_financeiras",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Descricao = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    ValorMeta = table.Column<decimal>(type: "numeric", nullable: false),
                    ValorAtual = table.Column<decimal>(type: "numeric", nullable: false),
                    Prazo = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    AtualizadoEm = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_metas_financeiras", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "projetos",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Nome = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Descricao = table.Column<string>(type: "text", nullable: true),
                    Stack = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    Percentual = table.Column<int>(type: "integer", nullable: false),
                    Status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    AtualizadoEm = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_projetos", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "registros_diarios",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Data = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    HorasEstudo = table.Column<decimal>(type: "numeric", nullable: true),
                    TopicoEstudo = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    FeaturesRift = table.Column<int>(type: "integer", nullable: false),
                    BugsRift = table.Column<int>(type: "integer", nullable: false),
                    Humor = table.Column<int>(type: "integer", nullable: true),
                    Travamento = table.Column<string>(type: "text", nullable: true),
                    Destaque = table.Column<string>(type: "text", nullable: true),
                    TreinoTipo = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    TreinoRendimento = table.Column<int>(type: "integer", nullable: true),
                    TreinoObs = table.Column<string>(type: "text", nullable: true),
                    CriadoEm = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_registros_diarios", x => x.Id);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "analises_semanais");

            migrationBuilder.DropTable(
                name: "metas_financeiras");

            migrationBuilder.DropTable(
                name: "projetos");

            migrationBuilder.DropTable(
                name: "registros_diarios");
        }
    }
}
