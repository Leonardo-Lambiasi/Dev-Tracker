using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LeoDevTracker.API.Migrations
{
    /// <inheritdoc />
    public partial class AddLazerAndRotinaCheckin : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "lazeres",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Usuario = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false, defaultValue: "rafa"),
                    Nome = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    CriadoEm = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lazeres", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "rotina_checkins",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SlotId = table.Column<Guid>(type: "uuid", nullable: false),
                    Usuario = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Semana = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    CriadoEm = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_rotina_checkins", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_lazeres_Usuario_Nome",
                table: "lazeres",
                columns: new[] { "Usuario", "Nome" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_rotina_checkins_SlotId_Usuario_Semana",
                table: "rotina_checkins",
                columns: new[] { "SlotId", "Usuario", "Semana" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "lazeres");

            migrationBuilder.DropTable(
                name: "rotina_checkins");
        }
    }
}
