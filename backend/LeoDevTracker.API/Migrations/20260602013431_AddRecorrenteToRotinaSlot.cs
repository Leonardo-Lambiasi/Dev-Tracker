using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LeoDevTracker.API.Migrations
{
    /// <inheritdoc />
    public partial class AddRecorrenteToRotinaSlot : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int[]>(
                name: "DiasRecorrentes",
                table: "rotina_slots",
                type: "integer[]",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsRecorrente",
                table: "rotina_slots",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DiasRecorrentes",
                table: "rotina_slots");

            migrationBuilder.DropColumn(
                name: "IsRecorrente",
                table: "rotina_slots");
        }
    }
}
