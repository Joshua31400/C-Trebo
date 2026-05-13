using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TreboApi.Migrations
{
    public partial class Fix_Members_ManyToMany : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "BoardUser",
                columns: table => new
                {
                    BoardId = table.Column<int>(type: "INTEGER", nullable: false),
                    UserId = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BoardUser", x => new { x.BoardId, x.UserId });
                    table.ForeignKey(
                        name: "FK_BoardUser_Boards_BoardId",
                        column: x => x.BoardId,
                        principalTable: "Boards",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_BoardUser_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "CardUser",
                columns: table => new
                {
                    CardId = table.Column<int>(type: "INTEGER", nullable: false),
                    UserId = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CardUser", x => new { x.CardId, x.UserId });
                    table.ForeignKey(
                        name: "FK_CardUser_Cards_CardId",
                        column: x => x.CardId,
                        principalTable: "Cards",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_CardUser_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.Sql(
                "INSERT OR IGNORE INTO BoardUser (BoardId, UserId) " +
                "SELECT BoardId, Id FROM Users WHERE BoardId IS NOT NULL");

            migrationBuilder.Sql(
                "INSERT OR IGNORE INTO CardUser (CardId, UserId) " +
                "SELECT CardId, Id FROM Users WHERE CardId IS NOT NULL");

            migrationBuilder.DropForeignKey(
                name: "FK_Users_Boards_BoardId",
                table: "Users");

            migrationBuilder.DropForeignKey(
                name: "FK_Users_Cards_CardId",
                table: "Users");

            migrationBuilder.DropIndex(
                name: "IX_Users_BoardId",
                table: "Users");

            migrationBuilder.DropIndex(
                name: "IX_Users_CardId",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "BoardId",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "CardId",
                table: "Users");

            migrationBuilder.CreateIndex(
                name: "IX_BoardUser_UserId",
                table: "BoardUser",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_CardUser_UserId",
                table: "CardUser",
                column: "UserId");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "BoardUser");
            migrationBuilder.DropTable(name: "CardUser");

            migrationBuilder.AddColumn<int>(
                name: "BoardId",
                table: "Users",
                type: "INTEGER",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "CardId",
                table: "Users",
                type: "INTEGER",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Users_BoardId",
                table: "Users",
                column: "BoardId");

            migrationBuilder.CreateIndex(
                name: "IX_Users_CardId",
                table: "Users",
                column: "CardId");

            migrationBuilder.AddForeignKey(
                name: "FK_Users_Boards_BoardId",
                table: "Users",
                column: "BoardId",
                principalTable: "Boards",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Users_Cards_CardId",
                table: "Users",
                column: "CardId",
                principalTable: "Cards",
                principalColumn: "Id");
        }
    }
}
