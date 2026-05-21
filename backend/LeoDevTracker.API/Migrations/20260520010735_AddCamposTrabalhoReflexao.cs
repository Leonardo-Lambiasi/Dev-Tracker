using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LeoDevTracker.API.Migrations
{
    /// <inheritdoc />
    public partial class AddCamposTrabalhoReflexao : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "Travamento",
                table: "registros_diarios",
                newName: "Desafios");

            migrationBuilder.AddColumn<string>(
                name: "Conquistas",
                table: "registros_diarios",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "HorasTrabalhadas",
                table: "registros_diarios",
                type: "numeric",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "TicketsTrabalhados",
                table: "registros_diarios",
                type: "integer",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Conquistas",
                table: "registros_diarios");

            migrationBuilder.DropColumn(
                name: "HorasTrabalhadas",
                table: "registros_diarios");

            migrationBuilder.DropColumn(
                name: "TicketsTrabalhados",
                table: "registros_diarios");

            migrationBuilder.RenameColumn(
                name: "Desafios",
                table: "registros_diarios",
                newName: "Travamento");
        }
    }
}
