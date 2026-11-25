using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EcommerceApp.Migrations
{
    /// <inheritdoc />
    public partial class AddTrustPageContent : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "TrustPageContents",
                columns: table => new
                {
                    Id               = table.Column<Guid>(type: "uuid", nullable: false),
                    Slug             = table.Column<string>(type: "text", nullable: false),
                    Title            = table.Column<string>(type: "text", nullable: false),
                    Subtitle         = table.Column<string>(type: "text", nullable: false),
                    HeroImageUrl     = table.Column<string>(type: "text", nullable: true),
                    AttachedFileUrl  = table.Column<string>(type: "text", nullable: true),
                    AttachedFileName = table.Column<string>(type: "text", nullable: true),
                    SectionsJson     = table.Column<string>(type: "text", nullable: false),
                    CreatedAt        = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt        = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsActive         = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TrustPageContents", x => x.Id);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "TrustPageContents");
        }
    }
}
