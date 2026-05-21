using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LeoDevTracker.API.Migrations
{
    /// <inheritdoc />
    public partial class AddInsightAndTipo : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "InsightDiario",
                table: "registros_diarios",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Tipo",
                table: "analises_semanais",
                type: "character varying(30)",
                maxLength: 30,
                nullable: true,
                defaultValue: "desenvolvimento");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "InsightDiario",
                table: "registros_diarios");

            migrationBuilder.DropColumn(
                name: "Tipo",
                table: "analises_semanais");
        }
    }
}
