using EcommerceApp.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace EcommerceApp.Tests.Support;

/// <summary>
/// A throw-away PostgreSQL database on the LOCAL development server (never production). It is created for a test
/// class and dropped afterwards. The server comes from ECOM_TEST_PG, or from the local connection string in the
/// API's appsettings.json (localhost:5433); anything that is not localhost is refused.
/// </summary>
public sealed class TestDatabase : IAsyncDisposable
{
    public string Name { get; } = "ecom_test_" + Guid.NewGuid().ToString("N")[..12];
    public string ConnectionString { get; private set; } = "";
    private string _adminConnection = "";

    public static async Task<TestDatabase> CreateAsync()
    {
        var db = new TestDatabase();
        var server = new NpgsqlConnectionStringBuilder(ServerConnectionString());

        var host = server.Host ?? "";
        if (host is not ("localhost" or "127.0.0.1" or "::1"))
            throw new InvalidOperationException("Tests only run against a local PostgreSQL server.");

        server.Database = "postgres";
        db._adminConnection = server.ConnectionString;
        await using (var admin = new NpgsqlConnection(db._adminConnection))
        {
            await admin.OpenAsync();
            await using var cmd = new NpgsqlCommand($"CREATE DATABASE \"{db.Name}\"", admin);
            await cmd.ExecuteNonQueryAsync();
        }

        server.Database = db.Name;
        db.ConnectionString = server.ConnectionString;

        await using var ctx = db.NewContext();
        await ctx.Database.EnsureCreatedAsync();
        return db;
    }

    /// <summary>
    /// A database whose shipment tables were created by the REAL migration script, not by the model: the schema is
    /// built, the two shipment tables are dropped, then the reviewed migration SQL is applied.
    /// </summary>
    public static async Task<TestDatabase> CreateMigratedAsync()
    {
        var db = await CreateAsync();
        await using var ctx = db.NewContext();
        await ctx.Database.ExecuteSqlRawAsync("DROP TABLE \"OrderFulfilments\"; DROP TABLE \"ShipmentTrackingEvents\"; DROP TABLE \"Shipments\";");
        await ctx.Database.ExecuteSqlRawAsync("CREATE TABLE IF NOT EXISTS \"__EFMigrationsHistory\" (\"MigrationId\" varchar(150) PRIMARY KEY, \"ProductVersion\" varchar(32) NOT NULL);");
        await db.ExecuteScriptAsync(db.ShipmentMigrationScript());
        await db.ExecuteScriptAsync(db.FulfilmentMigrationScript());
        return db;
    }

    public const string PreviousMigration = "20261007101057_AddCouponCodeToCart";

    /// <summary>The id of the shipment migration (the newest one).</summary>
    public string ShipmentMigrationId()
    {
        using var ctx = NewContext();
        return ctx.Database.GetMigrations().Single(m => m.EndsWith("_AddShipmentTracking"));
    }

    /// <summary>The SQL EF generates for exactly this migration (from the previous one), as the deployment script would contain.</summary>
    public string ShipmentMigrationScript()
    {
        using var ctx = NewContext();
        var migrator = Microsoft.EntityFrameworkCore.Infrastructure.AccessorExtensions.GetService<Microsoft.EntityFrameworkCore.Migrations.IMigrator>(ctx);
        return migrator.GenerateScript(PreviousMigration, ShipmentMigrationId());
    }

    /// <summary>The SQL for the fulfilment migration (Stage 2.4), applied on top of the shipment migration.</summary>
    public string FulfilmentMigrationScript()
    {
        using var ctx = NewContext();
        var migrator = Microsoft.EntityFrameworkCore.Infrastructure.AccessorExtensions.GetService<Microsoft.EntityFrameworkCore.Migrations.IMigrator>(ctx);
        return migrator.GenerateScript(ShipmentMigrationId(), ctx.Database.GetMigrations().Single(m => m.EndsWith("_AddFulfilment")));
    }

    public async Task ExecuteScriptAsync(string sql)
    {
        await using var conn = new NpgsqlConnection(ConnectionString);
        await conn.OpenAsync();
        await using var cmd = new NpgsqlCommand(sql, conn);
        await cmd.ExecuteNonQueryAsync();
    }

    public AppDbContext NewContext() =>
        new(new DbContextOptionsBuilder<AppDbContext>().UseNpgsql(ConnectionString).Options);

    private static string ServerConnectionString()
    {
        var fromEnv = Environment.GetEnvironmentVariable("ECOM_TEST_PG");
        if (!string.IsNullOrWhiteSpace(fromEnv)) return fromEnv;

        var settings = Path.Combine(ApiProject.Directory, "appsettings.json");
        using var doc = System.Text.Json.JsonDocument.Parse(File.ReadAllText(settings));
        return doc.RootElement.GetProperty("ConnectionStrings").GetProperty("DefaultConnection").GetString()!;
    }

    public async ValueTask DisposeAsync()
    {
        NpgsqlConnection.ClearAllPools();
        if (string.IsNullOrEmpty(_adminConnection)) return;
        await using var admin = new NpgsqlConnection(_adminConnection);
        await admin.OpenAsync();
        await using var cmd = new NpgsqlCommand($"DROP DATABASE IF EXISTS \"{Name}\" WITH (FORCE)", admin);
        await cmd.ExecuteNonQueryAsync();
    }
}

public static class ApiProject
{
    /// <summary>The folder that holds EcommerceApp.csproj, found by walking up from the test output.</summary>
    public static string Directory { get; } = Find();

    private static string Find()
    {
        var dir = new DirectoryInfo(AppContext.BaseDirectory);
        while (dir != null)
        {
            var candidate = Path.Combine(dir.FullName, "EcommerceApp", "EcommerceApp.csproj");
            if (File.Exists(candidate)) return Path.GetDirectoryName(candidate)!;
            dir = dir.Parent;
        }
        throw new InvalidOperationException("Could not find the EcommerceApp project folder.");
    }
}
