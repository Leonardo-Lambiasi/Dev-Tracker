using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LeoDevTracker.API.Migrations
{
    /// <inheritdoc />
    public partial class AddUsuarioToProjetosAndMetas : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Usuario",
                table: "projetos",
                type: "character varying(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "leo");

            migrationBuilder.AddColumn<string>(
                name: "Usuario",
                table: "metas_financeiras",
                type: "character varying(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "leo");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Usuario",
                table: "projetos");

            migrationBuilder.DropColumn(
                name: "Usuario",
                table: "metas_financeiras");
        }
    }
}
