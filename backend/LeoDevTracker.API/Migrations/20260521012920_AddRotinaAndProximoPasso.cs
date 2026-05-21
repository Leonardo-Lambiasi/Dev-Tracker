using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LeoDevTracker.API.Migrations
{
    /// <inheritdoc />
    public partial class AddRotinaAndProximoPasso : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ProximoPasso",
                table: "projetos",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "rotina_slots",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Usuario = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    DiaSemana = table.Column<int>(type: "integer", nullable: false),
                    Periodo = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Label = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Categoria = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    HoraInicio = table.Column<string>(type: "character varying(5)", maxLength: 5, nullable: true),
                    HoraFim = table.Column<string>(type: "character varying(5)", maxLength: 5, nullable: true),
                    CriadoEm = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_rotina_slots", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_rotina_slots_Usuario_DiaSemana",
                table: "rotina_slots",
                columns: new[] { "Usuario", "DiaSemana" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "rotina_slots");

            migrationBuilder.DropColumn(
                name: "ProximoPasso",
                table: "projetos");
        }
    }
}
