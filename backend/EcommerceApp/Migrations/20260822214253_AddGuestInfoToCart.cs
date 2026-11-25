using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EcommerceApp.Migrations
{
    /// <inheritdoc />
    public partial class AddGuestInfoToCart : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "GuestEmail",
                table: "Carts",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "GuestName",
                table: "Carts",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "GuestPhone",
                table: "Carts",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "GuestEmail",
                table: "Carts");

            migrationBuilder.DropColumn(
                name: "GuestName",
                table: "Carts");

            migrationBuilder.DropColumn(
                name: "GuestPhone",
                table: "Carts");
        }
    }
}
