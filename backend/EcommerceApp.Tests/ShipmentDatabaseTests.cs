using System.Text.RegularExpressions;
using EcommerceApp.Application.DTOs.Orders;
using EcommerceApp.Domain.Entities;
using EcommerceApp.Domain.Enums;
using EcommerceApp.Infrastructure.Data;
using EcommerceApp.Infrastructure.Services;
using EcommerceApp.Tests.Support;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Npgsql;

namespace EcommerceApp.Tests;

/// <summary>A database whose shipment tables come from the real migration script.</summary>
public class MigratedDbFixture : IAsyncLifetime
{
    public TestDatabase Db { get; private set; } = null!;
    public async Task InitializeAsync() => Db = await TestDatabase.CreateMigratedAsync();
    public async Task DisposeAsync() => await Db.DisposeAsync();
}

/// <summary>What the EF model says about the two shipment tables (no database needed).</summary>
public class ShipmentModelTests
{
    private static Microsoft.EntityFrameworkCore.Metadata.IModel Model()
    {
        using var ctx = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql("Host=localhost;Database=never_connected;Username=x;Password=x").Options);
        return ctx.GetService<Microsoft.EntityFrameworkCore.Metadata.IModel>();
    }

    private static Microsoft.EntityFrameworkCore.Metadata.IModel DesignModel()
    {
        using var ctx = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql("Host=localhost;Database=never_connected;Username=x;Password=x").Options);
        return ctx.GetService<Microsoft.EntityFrameworkCore.Metadata.IDesignTimeModel>().Model;
    }

    [Fact]
    public void Only_the_two_approved_entities_were_added_with_uuid_keys_and_the_right_table_names()
    {
        var model = Model();
        var shipment = model.FindEntityType(typeof(Shipment))!;
        var evt = model.FindEntityType(typeof(ShipmentTrackingEvent))!;

        Assert.Equal("Shipments", shipment.GetTableName());
        Assert.Equal("ShipmentTrackingEvents", evt.GetTableName());
        Assert.Equal(typeof(Guid), shipment.FindPrimaryKey()!.Properties.Single().ClrType);
        Assert.Equal(typeof(Guid), evt.FindPrimaryKey()!.Properties.Single().ClrType);
        Assert.Equal("uuid", shipment.FindProperty("Id")!.GetColumnType());
    }

    [Fact]
    public void Foreign_keys_never_cascade_so_shipment_history_is_preserved()
    {
        var model = Model();
        var shipment = model.FindEntityType(typeof(Shipment))!;
        var evt = model.FindEntityType(typeof(ShipmentTrackingEvent))!;

        Assert.Equal(DeleteBehavior.Restrict, shipment.GetForeignKeys().Single(f => f.PrincipalEntityType.ClrType == typeof(Order)).DeleteBehavior);
        Assert.Equal(DeleteBehavior.SetNull, shipment.GetForeignKeys().Single(f => f.PrincipalEntityType.ClrType == typeof(User)).DeleteBehavior);
        Assert.Equal(DeleteBehavior.Restrict, evt.GetForeignKeys().Single().DeleteBehavior);
        Assert.DoesNotContain(new[] { shipment, evt }.SelectMany(e => e.GetForeignKeys()), f => f.DeleteBehavior == DeleteBehavior.Cascade);
    }

    [Fact]
    public void Indexes_constraints_and_concurrency_token_match_the_approved_design()
    {
        var model = Model();
        var shipment = model.FindEntityType(typeof(Shipment))!;
        var evt = model.FindEntityType(typeof(ShipmentTrackingEvent))!;
        string[] Cols(Microsoft.EntityFrameworkCore.Metadata.IIndex i) => i.Properties.Select(p => p.Name).ToArray();
        var idx = shipment.GetIndexes().ToDictionary(i => i.GetDatabaseName()!);

        var open = idx["UX_Shipments_Order_Open"];
        Assert.True(open.IsUnique);
        Assert.Equal(["OrderId"], Cols(open));
        Assert.Equal(ShipmentRules.HoldsOrderFilterSql, open.GetFilter());

        Assert.True(idx["UX_Shipments_Mode_ClientOrderRef"].IsUnique);
        Assert.Equal(["Mode", "ClientOrderRef"], Cols(idx["UX_Shipments_Mode_ClientOrderRef"]));
        Assert.True(idx["UX_Shipments_Mode_Awb"].IsUnique);
        Assert.Equal("\"Awb\" IS NOT NULL", idx["UX_Shipments_Mode_Awb"].GetFilter());
        Assert.False(idx["IX_Shipments_Poll"].IsUnique);
        Assert.Contains("\"IsFinal\" = false", idx["IX_Shipments_Poll"].GetFilter());

        var hash = evt.GetIndexes().Single(i => i.GetDatabaseName() == "UX_ShipmentTrackingEvents_Shipment_Hash");
        Assert.True(hash.IsUnique);
        Assert.Equal(["ShipmentId", "EventHash"], Cols(hash));

        var design = DesignModel();
        var checks = design.FindEntityType(typeof(Shipment))!.GetCheckConstraints().Select(c => c.Name).ToHashSet();
        Assert.Superset(new HashSet<string?> { "CK_Shipments_Mode", "CK_Shipments_CreationState", "CK_Shipments_Status", "CK_Shipments_AwbWhenCreated" }, checks);
        Assert.Contains("CK_ShipmentTrackingEvents_Source", design.FindEntityType(typeof(ShipmentTrackingEvent))!.GetCheckConstraints().Select(c => c.Name));

        Assert.True(shipment.FindProperty("xmin")!.IsConcurrencyToken);
        Assert.Equal("text[]", shipment.FindProperty(nameof(Shipment.NotifiedStatuses))!.GetColumnType());
    }

    [Fact]
    public void Existing_order_tables_were_not_given_new_shipment_columns_or_navigations()
    {
        var order = Model().FindEntityType(typeof(Order))!;
        Assert.DoesNotContain(order.GetProperties(), p => p.Name.Contains("Shipment", StringComparison.OrdinalIgnoreCase));
        Assert.DoesNotContain(order.GetNavigations(), n => n.Name.Contains("Shipment", StringComparison.OrdinalIgnoreCase));
    }
}

/// <summary>The migration SQL itself: what it creates and what it must not touch.</summary>
public class ShipmentMigrationTests : IClassFixture<MigratedDbFixture>
{
    private readonly TestDatabase _t;
    public ShipmentMigrationTests(MigratedDbFixture f) => _t = f.Db;

    [Fact]
    public void Migration_script_creates_only_the_two_approved_tables_and_touches_nothing_else()
    {
        var sql = _t.ShipmentMigrationScript();

        var created = Regex.Matches(sql, "CREATE TABLE \"(\\w+)\"").Select(m => m.Groups[1].Value).ToList();
        Assert.Equal(["Shipments", "ShipmentTrackingEvents"], created.OrderBy(x => x).ToList());

        Assert.DoesNotContain("ALTER TABLE", sql, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotMatch(new Regex(@"^\s*(DROP|UPDATE|DELETE|TRUNCATE)\b", RegexOptions.Multiline | RegexOptions.IgnoreCase), sql);   // no statement that removes or changes data (ON DELETE RESTRICT is a constraint clause)
        Assert.DoesNotContain("xmin", sql);                       // a PostgreSQL system column, never created

        var indexTables = Regex.Matches(sql, "CREATE (?:UNIQUE )?INDEX \"\\w+\" ON \"(\\w+)\"").Select(m => m.Groups[1].Value).Distinct();
        Assert.All(indexTables, t => Assert.Contains(t, new[] { "Shipments", "ShipmentTrackingEvents" }));

        // the only other statement is the migration-history row
        var inserts = Regex.Matches(sql, "INSERT INTO \"(\\w+)\"").Select(m => m.Groups[1].Value).ToList();
        Assert.Equal(["__EFMigrationsHistory"], inserts);

        // foreign keys may only point at the existing Orders/Users tables and our own Shipments table
        var refs = Regex.Matches(sql, "REFERENCES \"(\\w+)\"").Select(m => m.Groups[1].Value).Distinct().OrderBy(x => x);
        Assert.Equal(["Orders", "Shipments", "Users"], refs);
    }

    [Fact]
    public async Task Both_tables_exist_after_the_migration_with_every_approved_constraint_and_index()
    {
        await using var ctx = _t.NewContext();
        var conn = ctx.Database.GetDbConnection();
        await conn.OpenAsync();

        async Task<List<string>> Q(string sql)
        {
            await using var cmd = conn.CreateCommand(); cmd.CommandText = sql;
            var list = new List<string>();
            await using var r = await cmd.ExecuteReaderAsync();
            while (await r.ReadAsync()) list.Add(r.GetString(0));
            return list;
        }

        var tables = await Q("select table_name from information_schema.tables where table_schema='public' and table_name like 'Shipment%' order by 1");
        Assert.Equal(["ShipmentTrackingEvents", "Shipments"], tables);

        var indexes = await Q("select indexname from pg_indexes where schemaname='public' and tablename like 'Shipment%'");
        Assert.Superset(new HashSet<string> { "UX_Shipments_Order_Open", "UX_Shipments_Mode_ClientOrderRef", "UX_Shipments_Mode_Awb", "IX_Shipments_Poll",
            "IX_Shipments_Order_CreatedAt", "UX_ShipmentTrackingEvents_Shipment_Hash", "IX_ShipmentTrackingEvents_Shipment_ScanTime" }, indexes.ToHashSet());

        var checks = await Q("select conname from pg_constraint where contype='c' and conrelid::regclass::text like '\"Shipment%'");
        Assert.Superset(new HashSet<string> { "CK_Shipments_Mode", "CK_Shipments_CreationState", "CK_Shipments_Status", "CK_Shipments_AwbWhenCreated",
            "CK_ShipmentTrackingEvents_Source", "CK_ShipmentTrackingEvents_MappedStatus" }, checks.ToHashSet());

        // delete behaviour of every foreign key (r = restrict / no cascade, n = set null)
        var fks = await Q("select conname || ':' || confdeltype::text from pg_constraint where contype='f' and conrelid::regclass::text like '\"Shipment%' order by 1");
        Assert.Equal(["FK_ShipmentTrackingEvents_Shipments_ShipmentId:r", "FK_Shipments_Orders_OrderId:r", "FK_Shipments_Users_CreatedByUserId:n"], fks);
    }
}

/// <summary>Constraints and relationships, proven on tables created by the real migration SQL.</summary>
public class ShipmentConstraintTests : IClassFixture<MigratedDbFixture>
{
    private readonly TestDatabase _t;
    public ShipmentConstraintTests(MigratedDbFixture f) => _t = f.Db;

    private static string Ref() => "ORD-T-" + Guid.NewGuid().ToString("N")[..8];
    private static string Awb() => "AWB" + Guid.NewGuid().ToString("N")[..10];

    private static Shipment NewShipment(Guid orderId, string state = "IN_FLIGHT", string status = "CREATED", string mode = "test", string? awb = null, string? reference = null) => new()
    {
        OrderId = orderId, Mode = mode, ClientOrderRef = reference ?? Ref(), CreationState = state, Status = status,
        Awb = state == "CREATED" ? awb ?? Awb() : awb
    };

    private async Task<Order> OrderAsync(AppDbContext db)
    {
        var product = await Seed.ProductAsync(db);
        return await Seed.OrderAsync(db, product, null, guestEmail: "g@example.test", guestPhone: "9876543210");
    }

    private static async Task<PostgresException> ViolationAsync(AppDbContext db, Func<Task> action)
    {
        var ex = await Assert.ThrowsAsync<DbUpdateException>(action);
        return Assert.IsType<PostgresException>(ex.InnerException);
    }

    // ----- one open shipment per order -----

    [Fact]
    public async Task A_second_open_shipment_for_the_same_order_is_rejected()
    {
        await using var db = _t.NewContext();
        var order = await OrderAsync(db);
        db.Shipments.Add(NewShipment(order.Id, "CREATED"));
        await db.SaveChangesAsync();

        await using var db2 = _t.NewContext();
        db2.Shipments.Add(NewShipment(order.Id, "IN_FLIGHT"));
        var v = await ViolationAsync(db2, () => db2.SaveChangesAsync());
        Assert.Equal("23505", v.SqlState);
        Assert.Equal("UX_Shipments_Order_Open", v.ConstraintName);
    }

    [Theory]
    [InlineData("FAILED", "CREATED")]            // a refused creation does not block a retry
    [InlineData("CREATED", "CANCELLED")]         // a cancelled shipment does not block a replacement
    [InlineData("CREATED", "RTO_DELIVERED")]     // neither does a parcel that came back
    public async Task A_new_open_shipment_is_allowed_when_the_earlier_one_is_not_open(string state, string status)
    {
        await using var db = _t.NewContext();
        var order = await OrderAsync(db);
        db.Shipments.Add(NewShipment(order.Id, state, status));
        await db.SaveChangesAsync();

        await using var db2 = _t.NewContext();
        db2.Shipments.Add(NewShipment(order.Id, "IN_FLIGHT"));
        await db2.SaveChangesAsync();                                                 // no exception

        Assert.Equal(2, await db2.Shipments.CountAsync(s => s.OrderId == order.Id));
    }

    [Fact]
    public async Task Different_orders_can_each_have_an_open_shipment()
    {
        await using var db = _t.NewContext();
        db.Shipments.Add(NewShipment((await OrderAsync(db)).Id));
        db.Shipments.Add(NewShipment((await OrderAsync(db)).Id));
        await db.SaveChangesAsync();
    }

    // ----- AWB and reference uniqueness -----

    [Fact]
    public async Task The_same_awb_cannot_be_used_twice_in_one_mode_but_may_in_another()
    {
        await using var db = _t.NewContext();
        var awb = Awb();
        db.Shipments.Add(NewShipment((await OrderAsync(db)).Id, "CREATED", awb: awb, mode: "test"));
        await db.SaveChangesAsync();

        await using var dup = _t.NewContext();
        dup.Shipments.Add(NewShipment((await OrderAsync(dup)).Id, "CREATED", awb: awb, mode: "test"));
        var v = await ViolationAsync(dup, () => dup.SaveChangesAsync());
        Assert.Equal("UX_Shipments_Mode_Awb", v.ConstraintName);

        await using var live = _t.NewContext();
        live.Shipments.Add(NewShipment((await OrderAsync(live)).Id, "CREATED", awb: awb, mode: "live"));
        await live.SaveChangesAsync();                                                 // different environment: allowed
    }

    [Fact]
    public async Task Many_shipments_without_an_awb_are_allowed()
    {
        await using var db = _t.NewContext();
        for (var i = 0; i < 3; i++) db.Shipments.Add(NewShipment((await OrderAsync(db)).Id, "IN_FLIGHT"));
        await db.SaveChangesAsync();                                                   // NULL awb is not a duplicate
    }

    [Fact]
    public async Task The_same_client_order_reference_cannot_be_sent_twice_to_one_environment()
    {
        await using var db = _t.NewContext();
        var reference = Ref();
        db.Shipments.Add(NewShipment((await OrderAsync(db)).Id, reference: reference));
        await db.SaveChangesAsync();

        await using var dup = _t.NewContext();
        dup.Shipments.Add(NewShipment((await OrderAsync(dup)).Id, reference: reference));
        var v = await ViolationAsync(dup, () => dup.SaveChangesAsync());
        Assert.Equal("UX_Shipments_Mode_ClientOrderRef", v.ConstraintName);
    }

    // ----- rejected values -----

    [Theory]
    [InlineData("production")]
    [InlineData("TEST")]
    [InlineData("")]
    public async Task An_invalid_mode_is_rejected(string mode)
    {
        await using var db = _t.NewContext();
        db.Shipments.Add(NewShipment((await OrderAsync(db)).Id, mode: mode));
        var v = await ViolationAsync(db, () => db.SaveChangesAsync());
        Assert.Equal("23514", v.SqlState);
        Assert.Equal("CK_Shipments_Mode", v.ConstraintName);
    }

    [Theory]
    [InlineData("PENDING")]
    [InlineData("created")]
    [InlineData("")]
    public async Task An_invalid_creation_state_is_rejected(string state)
    {
        await using var db = _t.NewContext();
        db.Shipments.Add(NewShipment((await OrderAsync(db)).Id, state));
        var v = await ViolationAsync(db, () => db.SaveChangesAsync());
        Assert.Equal("CK_Shipments_CreationState", v.ConstraintName);
    }

    [Fact]
    public async Task An_invalid_status_is_rejected()
    {
        await using var db = _t.NewContext();
        db.Shipments.Add(NewShipment((await OrderAsync(db)).Id, status: "ON_THE_MOON"));
        Assert.Equal("CK_Shipments_Status", (await ViolationAsync(db, () => db.SaveChangesAsync())).ConstraintName);
    }

    [Fact]
    public async Task A_created_shipment_must_have_an_awb()
    {
        await using var db = _t.NewContext();
        var s = NewShipment((await OrderAsync(db)).Id, "CREATED");
        s.Awb = null;
        db.Shipments.Add(s);
        Assert.Equal("CK_Shipments_AwbWhenCreated", (await ViolationAsync(db, () => db.SaveChangesAsync())).ConstraintName);
    }

    // ----- tracking events -----

    private static ShipmentTrackingEvent Event(Guid shipmentId, string hash, string source = "poll", string mapped = "IN_TRANSIT") => new()
    { ShipmentId = shipmentId, Status = "In Transit", StatusType = "UD", MappedStatus = mapped, EventHash = hash, Source = source, ScanTime = DateTime.UtcNow };

    [Fact]
    public async Task The_same_tracking_event_cannot_be_stored_twice_for_a_shipment()
    {
        await using var db = _t.NewContext();
        var s = NewShipment((await OrderAsync(db)).Id);
        db.Shipments.Add(s);
        db.ShipmentTrackingEvents.Add(Event(s.Id, "hash-1"));
        await db.SaveChangesAsync();

        await using var dup = _t.NewContext();
        dup.ShipmentTrackingEvents.Add(Event(s.Id, "hash-1"));
        var v = await ViolationAsync(dup, () => dup.SaveChangesAsync());
        Assert.Equal("UX_ShipmentTrackingEvents_Shipment_Hash", v.ConstraintName);

        await using var other = _t.NewContext();                                       // a different scan is fine
        other.ShipmentTrackingEvents.Add(Event(s.Id, "hash-2"));
        await other.SaveChangesAsync();
    }

    [Fact]
    public async Task The_same_event_hash_may_exist_on_different_shipments()
    {
        await using var db = _t.NewContext();
        var a = NewShipment((await OrderAsync(db)).Id);
        var b = NewShipment((await OrderAsync(db)).Id);
        db.Shipments.AddRange(a, b);
        db.ShipmentTrackingEvents.AddRange(Event(a.Id, "same"), Event(b.Id, "same"));
        await db.SaveChangesAsync();
    }

    [Fact]
    public async Task An_invalid_event_source_or_mapped_status_is_rejected()
    {
        await using var db = _t.NewContext();
        var s = NewShipment((await OrderAsync(db)).Id);
        db.Shipments.Add(s);
        await db.SaveChangesAsync();

        await using var a = _t.NewContext();
        a.ShipmentTrackingEvents.Add(Event(s.Id, "x1", source: "fax"));
        Assert.Equal("CK_ShipmentTrackingEvents_Source", (await ViolationAsync(a, () => a.SaveChangesAsync())).ConstraintName);

        await using var b = _t.NewContext();
        b.ShipmentTrackingEvents.Add(Event(s.Id, "x2", mapped: "TELEPORTED"));
        Assert.Equal("CK_ShipmentTrackingEvents_MappedStatus", (await ViolationAsync(b, () => b.SaveChangesAsync())).ConstraintName);
    }

    // ----- relationships and history preservation -----

    [Fact]
    public async Task Shipment_belongs_to_its_order_and_owns_its_events()
    {
        await using var db = _t.NewContext();
        var order = await OrderAsync(db);
        var s = NewShipment(order.Id);
        s.TrackingEvents.Add(Event(s.Id, "rel-1"));
        s.TrackingEvents.Add(Event(s.Id, "rel-2"));
        db.Shipments.Add(s);
        await db.SaveChangesAsync();

        await using var read = _t.NewContext();
        var loaded = await read.Shipments.Include(x => x.Order).Include(x => x.TrackingEvents).SingleAsync(x => x.Id == s.Id);
        Assert.Equal(order.OrderNumber, loaded.Order.OrderNumber);
        Assert.Equal(2, loaded.TrackingEvents.Count);
        Assert.Equal(["Delhivery"], new[] { loaded.CourierName });                      // default
        Assert.Empty(loaded.NotifiedStatuses);
        Assert.False(loaded.IsFinal);
    }

    [Fact]
    public async Task An_order_with_a_shipment_cannot_be_deleted()
    {
        await using var db = _t.NewContext();
        var order = await OrderAsync(db);
        db.Shipments.Add(NewShipment(order.Id));
        await db.SaveChangesAsync();

        await using var del = _t.NewContext();
        del.Orders.Remove((await del.Orders.FindAsync(order.Id))!);
        var v = await ViolationAsync(del, () => del.SaveChangesAsync());
        Assert.Equal("23001", v.SqlState);                                              // restrict_violation: history is protected
    }

    [Fact]
    public async Task A_shipment_with_tracking_events_cannot_be_deleted()
    {
        await using var db = _t.NewContext();
        var s = NewShipment((await OrderAsync(db)).Id);
        db.Shipments.Add(s);
        db.ShipmentTrackingEvents.Add(Event(s.Id, "keep-me"));
        await db.SaveChangesAsync();

        await using var del = _t.NewContext();
        del.Shipments.Remove((await del.Shipments.FindAsync(s.Id))!);
        Assert.Equal("23001", (await ViolationAsync(del, () => del.SaveChangesAsync())).SqlState);
        await using var check = _t.NewContext();
        Assert.Equal(1, await check.ShipmentTrackingEvents.CountAsync(e => e.ShipmentId == s.Id));
    }

    [Fact]
    public async Task Deleting_the_admin_who_created_a_shipment_keeps_the_shipment()
    {
        await using var db = _t.NewContext();
        var admin = await Seed.UserAsync(db, "Creator", UserRole.SuperAdmin);
        var s = NewShipment((await OrderAsync(db)).Id);
        s.CreatedByUserId = admin.Id;
        db.Shipments.Add(s);
        await db.SaveChangesAsync();

        await using var del = _t.NewContext();
        del.Users.Remove((await del.Users.FindAsync(admin.Id))!);
        await del.SaveChangesAsync();

        await using var check = _t.NewContext();
        Assert.Null((await check.Shipments.FindAsync(s.Id))!.CreatedByUserId);
    }

    [Fact]
    public async Task Two_updates_of_the_same_shipment_cannot_silently_overwrite_each_other()
    {
        await using var db = _t.NewContext();
        var s = NewShipment((await OrderAsync(db)).Id);
        db.Shipments.Add(s);
        await db.SaveChangesAsync();

        await using var a = _t.NewContext();
        await using var b = _t.NewContext();
        var sa = await a.Shipments.FindAsync(s.Id); var sb = await b.Shipments.FindAsync(s.Id);
        sa!.LastError = "first"; await a.SaveChangesAsync();
        sb!.LastError = "second";
        await Assert.ThrowsAsync<DbUpdateConcurrencyException>(() => b.SaveChangesAsync());
    }
}

/// <summary>The database-backed shipment guard, with the approved "open shipment" semantics.</summary>
public class ShipmentGuardTests : IClassFixture<MigratedDbFixture>
{
    private readonly TestDatabase _t;
    public ShipmentGuardTests(MigratedDbFixture f) => _t = f.Db;

    private async Task<(Order Order, Product Product)> OrderAsync(OrderStatus status = OrderStatus.Confirmed, Guid? userId = null)
    {
        await using var db = _t.NewContext();
        var product = await Seed.ProductAsync(db, stock: 10);
        var order = await Seed.OrderAsync(db, product, userId, status, qty: 1, guestEmail: userId == null ? "g@example.test" : null, guestPhone: userId == null ? "9876543210" : null);
        return (order, product);
    }

    private async Task AddShipmentAsync(Guid orderId, string state, string status)
    {
        await using var db = _t.NewContext();
        db.Shipments.Add(new Shipment
        {
            OrderId = orderId, Mode = "test", ClientOrderRef = "G-" + Guid.NewGuid().ToString("N")[..10],
            CreationState = state, Status = status, Awb = state == "CREATED" ? "AWB" + Guid.NewGuid().ToString("N")[..8] : null
        });
        await db.SaveChangesAsync();
    }

    private async Task<bool> HasOpenAsync(Guid orderId)
    {
        await using var db = _t.NewContext();
        return await new ShipmentOrderGuard(db).HasOpenShipmentAsync(orderId);
    }

    [Fact] public async Task No_shipment_exists_means_not_owned() => Assert.False(await HasOpenAsync((await OrderAsync()).Order.Id));

    [Theory]
    [InlineData("IN_FLIGHT", "CREATED", true)]          // creation in progress
    [InlineData("CREATED", "CREATED", true)]            // created
    [InlineData("CREATED", "IN_TRANSIT", true)]
    [InlineData("CREATED", "OUT_FOR_DELIVERY", true)]
    [InlineData("UNKNOWN", "CREATED", true)]            // unknown result: still owns the order until reconciled
    [InlineData("FAILED", "CREATED", false)]            // failed creation: nothing exists at the courier
    [InlineData("CREATED", "CANCELLED", false)]         // cancelled
    [InlineData("CREATED", "RTO_DELIVERED", false)]     // returned to origin
    public async Task Guard_follows_the_open_shipment_definition(string state, string status, bool expectedOpen)
    {
        var (order, _) = await OrderAsync();
        await AddShipmentAsync(order.Id, state, status);
        Assert.Equal(expectedOpen, await HasOpenAsync(order.Id));
    }

    public static IEnumerable<object[]> AllCombinations() =>
        from state in ShipmentConstants.CreationStates.All
        from status in ShipmentConstants.Statuses.All
        select new object[] { state, status };

    [Theory]
    [MemberData(nameof(AllCombinations))]
    public async Task The_guard_the_c_sharp_rule_and_the_unique_index_all_agree_for_every_state_and_status(string state, string status)
    {
        var (order, _) = await OrderAsync();
        var row = new Shipment { OrderId = order.Id, Mode = "test", ClientOrderRef = "A-" + Guid.NewGuid().ToString("N")[..10], CreationState = state, Status = status,
            Awb = state == "CREATED" ? "AWB" + Guid.NewGuid().ToString("N")[..8] : null };
        var expectedOpen = ShipmentRules.HoldsOrder.Compile()(row);

        await using (var db = _t.NewContext()) { db.Shipments.Add(row); await db.SaveChangesAsync(); }

        Assert.Equal(expectedOpen, await HasOpenAsync(order.Id));                       // the guard (SQL translation of the same rule)

        // the unique index: a second open row is rejected exactly when the first one is open
        await using var db2 = _t.NewContext();
        db2.Shipments.Add(new Shipment { OrderId = order.Id, Mode = "test", ClientOrderRef = "B-" + Guid.NewGuid().ToString("N")[..10], CreationState = "IN_FLIGHT" });
        var blocked = false;
        try { await db2.SaveChangesAsync(); } catch (DbUpdateException) { blocked = true; }
        Assert.Equal(expectedOpen, blocked);
    }

    [Fact]
    public async Task A_shipment_of_another_order_does_not_own_this_one()
    {
        var (a, _) = await OrderAsync();
        var (b, _) = await OrderAsync();
        await AddShipmentAsync(a.Id, "CREATED", "IN_TRANSIT");
        Assert.True(await HasOpenAsync(a.Id));
        Assert.False(await HasOpenAsync(b.Id));
    }

    // ----- the guard doing its job inside the order service -----

    [Fact]
    public async Task An_open_shipment_blocks_cancellation_and_manual_shipping_changes_but_a_closed_one_does_not()
    {
        await using var seed = _t.NewContext();
        var user = await Seed.UserAsync(seed, "GuardUser");
        var (order, product) = await OrderAsync(OrderStatus.Confirmed, user.Id);
        await AddShipmentAsync(order.Id, "CREATED", "IN_TRANSIT");

        await using var db = _t.NewContext();
        var svc = Seed.OrderService(db);
        Assert.Equal(409, (await svc.CancelAsync(order.Id, "x", user.Id, false)).StatusCode);
        Assert.Equal(409, (await svc.UpdateStatusAsync(order.Id, new UpdateOrderStatusDto { Status = OrderStatus.Shipped })).StatusCode);
        Assert.Equal(409, (await svc.UpdateStatusAsync(order.Id, new UpdateOrderStatusDto { Status = OrderStatus.Confirmed, TrackingNumber = "HAND" })).StatusCode);

        // once the shipment is cancelled the order is the store's again
        await using (var upd = _t.NewContext())
        {
            var s = await upd.Shipments.SingleAsync(x => x.OrderId == order.Id);
            s.Status = "CANCELLED"; s.IsFinal = true;
            await upd.SaveChangesAsync();
        }
        await using var db2 = _t.NewContext();
        Assert.True((await Seed.OrderService(db2).CancelAsync(order.Id, "now allowed", user.Id, false)).Success);
        Assert.Equal(10, await Seed.StockAsync(_t, product.Id));
    }
}
