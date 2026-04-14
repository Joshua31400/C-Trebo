using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TreboApi.Migrations
{
    /// <inheritdoc />
    public partial class Elements_Position_10 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "Position",
                table: "Columns",
                type: "INTEGER",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Position",
                table: "Cards",
                type: "INTEGER",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Position",
                table: "Columns");

            migrationBuilder.DropColumn(
                name: "Position",
                table: "Cards");
        }
    }
}
