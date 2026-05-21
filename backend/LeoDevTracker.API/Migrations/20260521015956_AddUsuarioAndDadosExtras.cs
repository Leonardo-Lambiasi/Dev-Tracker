using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LeoDevTracker.API.Migrations
{
    /// <inheritdoc />
    public partial class AddUsuarioAndDadosExtras : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "DadosExtras",
                table: "registros_diarios",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Usuario",
                table: "registros_diarios",
                type: "character varying(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "leo");

            migrationBuilder.AddColumn<string>(
                name: "Usuario",
                table: "analises_semanais",
                type: "character varying(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "leo");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DadosExtras",
                table: "registros_diarios");

            migrationBuilder.DropColumn(
                name: "Usuario",
                table: "registros_diarios");

            migrationBuilder.DropColumn(
                name: "Usuario",
                table: "analises_semanais");
        }
    }
}
