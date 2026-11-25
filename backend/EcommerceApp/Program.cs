using EcommerceApp.API.Middleware;
using EcommerceApp.Application.Mappings;
using EcommerceApp.Infrastructure.Extensions;
using FluentValidation;
using FluentValidation.AspNetCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Serilog;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// --- Local (git-ignored) secrets; real environments use environment variables, e.g. Email__Password ---
builder.Configuration.AddJsonFile("appsettings.Local.json", optional: true, reloadOnChange: true);
builder.Configuration.AddEnvironmentVariables();

// --- Serilog ---
Log.Logger = new LoggerConfiguration()
    .ReadFrom.Configuration(builder.Configuration)
    .Enrich.FromLogContext()
    .WriteTo.Console()
    .WriteTo.File("logs/ecommerce-.log", rollingInterval: RollingInterval.Day)
    .CreateLogger();

builder.Host.UseSerilog();

// --- Infrastructure (EF, services) ---
builder.Services.AddInfrastructure(builder.Configuration);

// --- AutoMapper ---
builder.Services.AddAutoMapper(typeof(MappingProfile));

// --- FluentValidation ---
builder.Services.AddFluentValidationAutoValidation();
builder.Services.AddValidatorsFromAssemblyContaining<EcommerceApp.Application.Validators.RegisterValidator>();

// --- JWT Authentication ---
var jwtKey = builder.Configuration["Jwt:Key"]
    ?? throw new InvalidOperationException("JWT Key not configured.");

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
            ClockSkew = TimeSpan.Zero
        };

        options.Events = new JwtBearerEvents
        {
            OnTokenValidated = async ctx =>
            {
                if (!Guid.TryParse(ctx.Principal?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value, out var userId))
                {
                    ctx.Fail("Invalid token.");
                    return;
                }

                var db = ctx.HttpContext.RequestServices.GetRequiredService<EcommerceApp.Infrastructure.Data.AppDbContext>();
                var user = await db.Users.AsNoTracking()
                    .Where(u => u.Id == userId)
                    .Select(u => new { u.IsActive, u.PasswordChangedAt })
                    .FirstOrDefaultAsync();

                if (user == null || !user.IsActive)
                {
                    ctx.Fail("User is no longer valid.");
                    return;
                }

                // a password reset signs the user out everywhere: older tokens (or tokens with no issue time) are refused
                if (user.PasswordChangedAt.HasValue)
                {
                    var iatClaim = ctx.Principal!.FindFirst("iat")?.Value;
                    var changedAt = new DateTimeOffset(DateTime.SpecifyKind(user.PasswordChangedAt.Value, DateTimeKind.Utc)).ToUnixTimeSeconds();
                    if (!long.TryParse(iatClaim, out var issuedAt) || issuedAt < changedAt)
                        ctx.Fail("Session expired. Please sign in again.");
                }
            }
        };
    });

builder.Services.AddAuthorization();

// --- Rate limiting (per client IP) for the credential endpoints ---
builder.Services.AddRateLimiter(o =>
{
    o.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    o.AddPolicy("login", http => System.Threading.RateLimiting.RateLimitPartition.GetFixedWindowLimiter(
        http.Connection.RemoteIpAddress?.ToString() ?? "unknown",
        _ => new System.Threading.RateLimiting.FixedWindowRateLimiterOptions { PermitLimit = builder.Configuration.GetValue("RateLimit:LoginPerMinute", 20), Window = TimeSpan.FromMinutes(1) }));
    o.AddPolicy("order-track", http => System.Threading.RateLimiting.RateLimitPartition.GetFixedWindowLimiter(
        http.Connection.RemoteIpAddress?.ToString() ?? "unknown",
        _ => new System.Threading.RateLimiting.FixedWindowRateLimiterOptions { PermitLimit = builder.Configuration.GetValue("RateLimit:OrderTrackPerMinute", 10), Window = TimeSpan.FromMinutes(1) }));
    o.AddPolicy("password-reset", http => System.Threading.RateLimiting.RateLimitPartition.GetFixedWindowLimiter(
        http.Connection.RemoteIpAddress?.ToString() ?? "unknown",
        _ => new System.Threading.RateLimiting.FixedWindowRateLimiterOptions { PermitLimit = builder.Configuration.GetValue("RateLimit:PasswordResetPerMinute", 10), Window = TimeSpan.FromMinutes(1) }));
});

// --- CORS ---
builder.Services.AddCors(opt =>
    opt.AddPolicy("EcommercePolicy", policy =>
        policy.WithOrigins(
            builder.Configuration.GetSection("AllowedOrigins").Get<string[]>()
                ?? ["http://localhost:4200"])
        .AllowAnyMethod()
        .AllowAnyHeader()
        .AllowCredentials()));

// --- Controllers ---
builder.Services.AddControllers();

// --- Swagger ---
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "EcommerceApp API",
        Version = "v1",
        Description = "Production-ready Mid-Level Ecommerce REST API"
    });

    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        In = ParameterLocation.Header,
        Description = "Enter: Bearer {token}",
        Name = "Authorization",
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });

    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
            },
            Array.Empty<string>()
        }
    });
});

var app = builder.Build();

// --- Middleware pipeline ---
// Behind the nginx reverse proxy the app only sees the proxy's address. Trust X-Forwarded-For/-Proto so the
// per-IP rate limits and the HTTPS scheme refer to the real visitor. (The proxy network is private to Docker.)
var forwarded = new ForwardedHeadersOptions
{
    ForwardedHeaders = Microsoft.AspNetCore.HttpOverrides.ForwardedHeaders.XForwardedFor
                     | Microsoft.AspNetCore.HttpOverrides.ForwardedHeaders.XForwardedProto
};
forwarded.KnownNetworks.Clear();
forwarded.KnownProxies.Clear();
app.UseForwardedHeaders(forwarded);

app.UseMiddleware<ExceptionMiddleware>();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c => c.SwaggerEndpoint("/swagger/v1/swagger.json", "EcommerceApp v1"));
}

app.UseHttpsRedirection();
app.UseCors("EcommercePolicy");
app.UseStaticFiles();
app.UseSerilogRequestLogging();
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Lifetime.ApplicationStarted.Register(() =>
{
    var urls = string.Join("  |  ", app.Urls);
    Console.ForegroundColor = ConsoleColor.Cyan;
    Console.WriteLine("\n┌─────────────────────────────────────────────┐");
    Console.WriteLine("│        EcommerceApp API  ─  RUNNING          │");
    Console.WriteLine($"│  URL  : {urls,-37}│");
    Console.WriteLine($"│  Swagger : {(app.Urls.FirstOrDefault() ?? "http://localhost:5000") + "/swagger",-33}│");
    Console.WriteLine("└─────────────────────────────────────────────┘\n");
    Console.ResetColor();
});

// --- Auto-create DB schema on startup (dev only; use migrations in prod) ---
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<EcommerceApp.Infrastructure.Data.AppDbContext>();
    db.Database.EnsureCreated();

    // Columns added to Users after the initial schema (EnsureCreated does not alter existing tables)
    db.Database.ExecuteSqlRaw("""
        ALTER TABLE "Users"
            ADD COLUMN IF NOT EXISTS "PasswordResetOtpHash" text,
            ADD COLUMN IF NOT EXISTS "PasswordResetAttempts" integer NOT NULL DEFAULT 0,
            ADD COLUMN IF NOT EXISTS "PasswordResetLastSentAt" timestamp with time zone,
            ADD COLUMN IF NOT EXISTS "PasswordResetSendCount" integer NOT NULL DEFAULT 0,
            ADD COLUMN IF NOT EXISTS "PasswordResetWindowStart" timestamp with time zone,
            ADD COLUMN IF NOT EXISTS "PasswordChangedAt" timestamp with time zone
        """);

    // Legacy Sidham data model (states, promo offers, payment options, per-item shipping, sub-admins).
    // New databases get these from the model; existing ones (UAT) get them here.
    db.Database.ExecuteSqlRaw("""
        ALTER TABLE "Users"
            ADD COLUMN IF NOT EXISTS "RazorpayCustomerId" text,
            ADD COLUMN IF NOT EXISTS "Permissions" text;
        ALTER TABLE "Addresses"
            ADD COLUMN IF NOT EXISTS "Label" text,
            ADD COLUMN IF NOT EXISTS "SecondaryPhone" text,
            ADD COLUMN IF NOT EXISTS "DeliveryInstructions" text;
        ALTER TABLE "OrderItems"
            ADD COLUMN IF NOT EXISTS "ItemStatus" text,
            ADD COLUMN IF NOT EXISTS "CancelReason" text,
            ADD COLUMN IF NOT EXISTS "ShipmentId" text,
            ADD COLUMN IF NOT EXISTS "PickupId" uuid,
            ADD COLUMN IF NOT EXISTS "CouponCode" text,
            ADD COLUMN IF NOT EXISTS "CouponDiscount" numeric NOT NULL DEFAULT 0,
            ADD COLUMN IF NOT EXISTS "TransactionId" text,
            ADD COLUMN IF NOT EXISTS "PaymentDate" timestamp with time zone,
            ADD COLUMN IF NOT EXISTS "RefundId" uuid,
            ADD COLUMN IF NOT EXISTS "RefundAmount" numeric,
            ADD COLUMN IF NOT EXISTS "RefundReason" text,
            ADD COLUMN IF NOT EXISTS "RefundStatus" text;
        ALTER TABLE "Coupons" ADD COLUMN IF NOT EXISTS "Scope" text NOT NULL DEFAULT 'global';
        ALTER TABLE "Banners"
            ADD COLUMN IF NOT EXISTS "StartDate" date,
            ADD COLUMN IF NOT EXISTS "EndDate" date;
        ALTER TABLE "Products"
            ADD COLUMN IF NOT EXISTS "Brand" text,
            ADD COLUMN IF NOT EXISTS "Unit" text;
        """);
    db.Database.ExecuteSqlRaw("""
        CREATE TABLE IF NOT EXISTS "States" (
            "Id" uuid NOT NULL, "Name" text NOT NULL DEFAULT '', "Code" text NOT NULL DEFAULT '', "CountryCode" text NOT NULL DEFAULT 'IN',
            "CreatedAt" timestamp with time zone NOT NULL DEFAULT now(), "UpdatedAt" timestamp with time zone, "IsActive" boolean NOT NULL DEFAULT true,
            CONSTRAINT "PK_States" PRIMARY KEY ("Id"));
        CREATE TABLE IF NOT EXISTS "PromoOffers" (
            "Id" uuid NOT NULL, "Title" text NOT NULL DEFAULT '', "Description" text,
            "CreatedAt" timestamp with time zone NOT NULL DEFAULT now(), "UpdatedAt" timestamp with time zone, "IsActive" boolean NOT NULL DEFAULT true,
            CONSTRAINT "PK_PromoOffers" PRIMARY KEY ("Id"));
        CREATE TABLE IF NOT EXISTS "PaymentOptions" (
            "Id" uuid NOT NULL, "Name" text NOT NULL DEFAULT '', "Description" text, "IconUrl" text, "SortOrder" integer NOT NULL DEFAULT 0, "IsEnabled" boolean NOT NULL DEFAULT true,
            "CreatedAt" timestamp with time zone NOT NULL DEFAULT now(), "UpdatedAt" timestamp with time zone, "IsActive" boolean NOT NULL DEFAULT true,
            CONSTRAINT "PK_PaymentOptions" PRIMARY KEY ("Id"));
        CREATE TABLE IF NOT EXISTS "OrderItemTrackings" (
            "Id" uuid NOT NULL, "OrderItemId" uuid NOT NULL, "StatusKey" text NOT NULL DEFAULT '', "Title" text NOT NULL DEFAULT '', "Description" text,
            "EventTime" timestamp with time zone NOT NULL DEFAULT now(), "Location" text, "CourierName" text, "AwbNumber" text, "Source" text, "Meta" text,
            "CreatedAt" timestamp with time zone NOT NULL DEFAULT now(), "UpdatedAt" timestamp with time zone, "IsActive" boolean NOT NULL DEFAULT true,
            CONSTRAINT "PK_OrderItemTrackings" PRIMARY KEY ("Id"));
        CREATE TABLE IF NOT EXISTS "OrderPickups" (
            "Id" uuid NOT NULL, "PickupId" text NOT NULL DEFAULT '', "PickupLocationName" text, "ClientName" text, "IncomingCenterName" text,
            "PickupDate" date, "PickupTime" time without time zone, "ExpectedPackageCount" integer NOT NULL DEFAULT 0, "RequestPayload" text, "ResponsePayload" text,
            "CreatedAt" timestamp with time zone NOT NULL DEFAULT now(), "UpdatedAt" timestamp with time zone, "IsActive" boolean NOT NULL DEFAULT true,
            CONSTRAINT "PK_OrderPickups" PRIMARY KEY ("Id"));
        CREATE TABLE IF NOT EXISTS "CouponProducts" (
            "Id" uuid NOT NULL, "CouponId" uuid NOT NULL, "ProductId" uuid NOT NULL,
            "CreatedAt" timestamp with time zone NOT NULL DEFAULT now(), "UpdatedAt" timestamp with time zone, "IsActive" boolean NOT NULL DEFAULT true,
            CONSTRAINT "PK_CouponProducts" PRIMARY KEY ("Id"));
        CREATE TABLE IF NOT EXISTS "CouponCategories" (
            "Id" uuid NOT NULL, "CouponId" uuid NOT NULL, "CategoryId" uuid NOT NULL,
            "CreatedAt" timestamp with time zone NOT NULL DEFAULT now(), "UpdatedAt" timestamp with time zone, "IsActive" boolean NOT NULL DEFAULT true,
            CONSTRAINT "PK_CouponCategories" PRIMARY KEY ("Id"));
        -- verbatim copy of every imported legacy row, so nothing from the old system is ever lost
        CREATE TABLE IF NOT EXISTS "LegacyImportArchive" (
            "SourceTable" text NOT NULL, "SourceId" text NOT NULL, "Data" jsonb NOT NULL, "ImportedAt" timestamp with time zone NOT NULL DEFAULT now(),
            CONSTRAINT "PK_LegacyImportArchive" PRIMARY KEY ("SourceTable", "SourceId"));
        """);

    // Cart coupon column from the 2026-10-07 change; a database created before it (e.g. UAT) lacks it and every cart call failed
    db.Database.ExecuteSqlRaw("""
        ALTER TABLE "Carts" ADD COLUMN IF NOT EXISTS "AppliedCouponCode" text
        """);

    // Create tables added after initial EnsureCreated (EnsureCreated is a no-op on existing DBs)
    db.Database.ExecuteSqlRaw("""
        CREATE TABLE IF NOT EXISTS "ConsultationRequests" (
            "Id" uuid NOT NULL DEFAULT gen_random_uuid(),
            "Name" text NOT NULL DEFAULT '',
            "Email" text NOT NULL DEFAULT '',
            "Phone" text NOT NULL DEFAULT '',
            "Concern" text NOT NULL DEFAULT '',
            "PreferredDate" text,
            "PreferredTime" text,
            "DoshaType" text,
            "Status" integer NOT NULL DEFAULT 1,
            "AdminNotes" text,
            "CreatedAt" timestamp with time zone NOT NULL DEFAULT now(),
            "UpdatedAt" timestamp with time zone,
            "IsActive" boolean NOT NULL DEFAULT true,
            CONSTRAINT "PK_ConsultationRequests" PRIMARY KEY ("Id")
        )
        """);
    db.Database.ExecuteSqlRaw("""
        CREATE TABLE IF NOT EXISTS "ReturnRequests" (
            "Id" uuid NOT NULL DEFAULT gen_random_uuid(),
            "OrderId" uuid NOT NULL,
            "UserId" uuid,
            "OrderNumber" text NOT NULL DEFAULT '',
            "CustomerName" text NOT NULL DEFAULT '',
            "CustomerEmail" text NOT NULL DEFAULT '',
            "Reason" text NOT NULL DEFAULT '',
            "Description" text,
            "Status" integer NOT NULL DEFAULT 1,
            "AdminNotes" text,
            "CreatedAt" timestamp with time zone NOT NULL DEFAULT now(),
            "UpdatedAt" timestamp with time zone,
            "IsActive" boolean NOT NULL DEFAULT true,
            CONSTRAINT "PK_ReturnRequests" PRIMARY KEY ("Id")
        )
        """);
    db.Database.ExecuteSqlRaw("""
        CREATE TABLE IF NOT EXISTS "Referrals" (
            "Id" uuid NOT NULL DEFAULT gen_random_uuid(),
            "ReferrerId" uuid NOT NULL,
            "ReferralCode" text NOT NULL DEFAULT '',
            "ReferredEmail" text,
            "ReferredUserId" uuid,
            "Status" integer NOT NULL DEFAULT 1,
            "RewardAmount" numeric NOT NULL DEFAULT 50,
            "RewardClaimed" boolean NOT NULL DEFAULT false,
            "CreatedAt" timestamp with time zone NOT NULL DEFAULT now(),
            "UpdatedAt" timestamp with time zone,
            "IsActive" boolean NOT NULL DEFAULT true,
            CONSTRAINT "PK_Referrals" PRIMARY KEY ("Id")
        )
        """);

    // Seed the Super Admin account on first run
    // The account comes from configuration (SeedAdmin:Email / SeedAdmin:Password) — nothing is hardcoded.
    if (!db.Users.Any(u => u.Role == EcommerceApp.Domain.Enums.UserRole.SuperAdmin))
    {
        var seedEmail = app.Configuration["SeedAdmin:Email"];
        var seedPassword = app.Configuration["SeedAdmin:Password"];
        if (string.IsNullOrWhiteSpace(seedEmail) || string.IsNullOrWhiteSpace(seedPassword))
        {
            app.Logger.LogWarning("No SuperAdmin exists and SeedAdmin:Email / SeedAdmin:Password are not configured - skipping admin seed.");
        }
        else
        {
            db.Users.Add(new EcommerceApp.Domain.Entities.User
            {
                FirstName = "Super",
                LastName = "Admin",
                Email = seedEmail.Trim().ToLower(),
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(seedPassword),
                Role = EcommerceApp.Domain.Enums.UserRole.SuperAdmin,
                EmailVerified = true
            });
            db.SaveChanges();
        }
    }

    // Seed 10 Ayurvedic blog posts
    if (!db.BlogPosts.Any())
    {
        var now = DateTime.UtcNow;
        db.BlogPosts.AddRange(new[]
        {
            new EcommerceApp.Domain.Entities.BlogPost
            {
                Title = "The Power of Ashwagandha: India's Ancient Stress Buster",
                Slug = "power-of-ashwagandha-ancient-stress-buster",
                Category = "Adaptogens",
                Author = "Dr. Priya Sharma",
                Excerpt = "Ashwagandha has been used for over 3,000 years to relieve stress, increase energy levels, and improve concentration. Discover how this adaptogenic root can transform your daily wellness.",
                Content = "<p>Ashwagandha (<em>Withania somnifera</em>), one of the most important herbs in Ayurveda, has been used for millennia as a Rasayana — a rejuvenator that promotes longevity and vitality.</p><h2>What Makes Ashwagandha Special?</h2><p>The name \"Ashwagandha\" comes from the Sanskrit words for horse (<em>ashwa</em>) and smell (<em>gandha</em>), referring both to its horse-like odour and the traditional belief that consuming it grants the strength and vitality of a horse.</p><p>Modern science has validated many of its traditional uses. It contains withanolides, a group of steroidal lactones unique to the plant that account for most of its adaptogenic effects.</p><h2>Evidence-Based Benefits</h2><ul><li><strong>Cortisol reduction:</strong> Multiple double-blind studies show a 20–30% reduction in cortisol levels with consistent use.</li><li><strong>Sleep quality:</strong> A 2019 study in Medicine found significant improvement in sleep quality and morning alertness.</li><li><strong>Strength and recovery:</strong> Athletes supplementing with ashwagandha showed notable gains in muscle strength and reduced exercise-induced muscle damage.</li><li><strong>Cognitive function:</strong> Improves memory, reaction time, and the ability to perform cognitive tasks.</li></ul><h2>How to Use It</h2><p>The traditional way is to mix 1/4 to 1/2 teaspoon of ashwagandha powder in warm milk with a little honey before bed — a preparation known as <em>Ashwagandha Kshira</em>. Modern standardised extracts (300–600 mg/day) are equally effective.</p>",
                CoverImageUrl = "https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=800&q=80",
                PublishedAt = now.AddDays(-3),
                SortOrder = 1,
                IsActive = true,
                CreatedAt = now.AddDays(-3)
            },
            new EcommerceApp.Domain.Entities.BlogPost
            {
                Title = "7 Ayurvedic Herbs That Strengthen Immunity Naturally",
                Slug = "ayurvedic-herbs-boost-immunity-naturally",
                Category = "Immunity",
                Author = "Dr. Arjun Mehta",
                Excerpt = "From Giloy to Tulsi, ancient Ayurvedic herbs offer powerful, time-tested support for your immune system. Here are seven that modern research is now backing with evidence.",
                Content = "<p>In Ayurveda, immunity is called <em>Vyadhikshamatva</em> — the body's inherent ability to resist disease. Rather than suppressing symptoms, Ayurveda focuses on building a foundation so robust that illness finds little foothold.</p><h2>The Seven Essential Immune Herbs</h2><ol><li><strong>Giloy (Tinospora cordifolia)</strong> — The 'root of immortality', Giloy activates macrophages and T-cells, directly strengthening innate immunity. Safe for long-term daily use.</li><li><strong>Tulsi (Ocimum sanctum)</strong> — Holy Basil is an adaptogen, anti-viral, and anti-bacterial in one. A daily cup of Tulsi tea addresses both the stress that suppresses immunity and the pathogens that exploit it.</li><li><strong>Amalaki (Emblica officinalis)</strong> — One of the richest natural sources of Vitamin C (20× more bioavailable than synthetic ascorbic acid), Amalaki is the foundation of Chyawanprash.</li><li><strong>Neem (Azadirachta indica)</strong> — A potent blood purifier that eliminates toxins (Ama) that create an environment where disease thrives.</li><li><strong>Mulethi (Glycyrrhiza glabra)</strong> — Liquorice root modulates cytokine production, making it especially useful during respiratory infections.</li><li><strong>Shilajit</strong> — The mineral-rich resin from the Himalayas, rich in fulvic acid, dramatically improves cellular energy production and micronutrient absorption.</li><li><strong>Haritaki (Terminalia chebula)</strong> — Called the 'king of medicines' in Tibetan medicine, it balances all three doshas while cleansing the gut — where 70% of immunity resides.</li></ol>",
                CoverImageUrl = "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80",
                PublishedAt = now.AddDays(-7),
                SortOrder = 2,
                IsActive = true,
                CreatedAt = now.AddDays(-7)
            },
            new EcommerceApp.Domain.Entities.BlogPost
            {
                Title = "Understanding Your Dosha: Vata, Pitta & Kapha Explained",
                Slug = "understanding-your-dosha-vata-pitta-kapha",
                Category = "Ayurveda Basics",
                Author = "Dr. Kavita Nair",
                Excerpt = "The three doshas — Vata, Pitta, and Kapha — are the biological energies found throughout the human body and mind. Learn your prakriti and transform how you eat, sleep, and live.",
                Content = "<p>Ayurveda teaches that every human being is a unique mixture of five elements — earth, water, fire, air, and ether — that combine to form three primary life forces known as <em>doshas</em>.</p><h2>Vata (Air + Ether)</h2><p>Vata governs all movement in the body — the flow of breath, the pulsation of the heart, all muscle contractions. Vata types are creative, quick-thinking, and enthusiastic. When out of balance, anxiety, dry skin, constipation, and insomnia appear.</p><p><strong>Balance Vata with:</strong> Warm, moist, grounding foods; sesame oil self-massage (Abhyanga); regular routine; warming spices like ginger, cinnamon, and cardamom.</p><h2>Pitta (Fire + Water)</h2><p>Pitta governs digestion, metabolism, and transformation. Pitta types are intense, intelligent, goal-oriented, and leaders by nature. Imbalanced Pitta manifests as inflammation, heartburn, anger, and skin rashes.</p><p><strong>Balance Pitta with:</strong> Cool, refreshing foods; coconut oil; avoiding excessive heat and competition; cooling herbs like coriander, fennel, and mint.</p><h2>Kapha (Earth + Water)</h2><p>Kapha provides structure, lubrication, and stability. Kapha types are calm, loving, and methodical. Kapha imbalance leads to weight gain, lethargy, congestion, and attachment.</p><p><strong>Balance Kapha with:</strong> Light, warm, and spicy foods; vigorous exercise; stimulating herbs like black pepper, dry ginger, and trikatu formula.</p>",
                CoverImageUrl = "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=800&q=80",
                PublishedAt = now.AddDays(-12),
                SortOrder = 3,
                IsActive = true,
                CreatedAt = now.AddDays(-12)
            },
            new EcommerceApp.Domain.Entities.BlogPost
            {
                Title = "Dinacharya: The Ayurvedic Morning Routine That Changes Everything",
                Slug = "dinacharya-ayurvedic-morning-routine",
                Category = "Wellness",
                Author = "Dr. Priya Sharma",
                Excerpt = "Dinacharya — Ayurveda's daily routine — is one of the most powerful preventative tools in the entire system. Just 45 minutes each morning can profoundly shift your energy, digestion, and mental clarity.",
                Content = "<p><em>Dinacharya</em> (from Sanskrit: <em>dina</em> = day, <em>charya</em> = to follow) is the Ayurvedic concept of a daily routine aligned with nature's rhythms. The classics describe it as the single most important preventative health practice.</p><h2>The Ideal Morning Sequence</h2><ol><li><strong>Wake before sunrise (Brahma Muhurta)</strong> — The 96-minute window before sunrise is considered the most sattvic (pure) time of day, ideal for meditation and study.</li><li><strong>Scrape your tongue</strong> — A copper tongue scraper removes the overnight accumulation of Ama (toxins) before they can be reabsorbed.</li><li><strong>Oil Pulling (Gandusha)</strong> — Swish 1 tablespoon of cold-pressed sesame or coconut oil for 10–15 minutes. Ancient practice with growing modern evidence for oral and systemic health.</li><li><strong>Nasya</strong> — 2 drops of warm sesame oil in each nostril lubricates the nasal passages, sharpens the senses, and protects against airborne pathogens.</li><li><strong>Abhyanga (self-massage)</strong> — A 5–10 minute warm oil massage before bathing stimulates lymph flow, nourishes the skin, and grounds Vata energy.</li><li><strong>Warm water or herbal tea</strong> — Never cold water first thing. Warm water kindles Agni (digestive fire) gently.</li></ol>",
                CoverImageUrl = "https://images.unsplash.com/photo-1545389336-cf090694435e?auto=format&fit=crop&w=800&q=80",
                PublishedAt = now.AddDays(-18),
                SortOrder = 4,
                IsActive = true,
                CreatedAt = now.AddDays(-18)
            },
            new EcommerceApp.Domain.Entities.BlogPost
            {
                Title = "Turmeric: The Golden Spice with Extraordinary Healing Power",
                Slug = "turmeric-golden-spice-healing-power",
                Category = "Herbal Wisdom",
                Author = "Dr. Arjun Mehta",
                Excerpt = "Curcumin, the active compound in turmeric, has been studied in over 12,000 peer-reviewed papers. Yet Ayurveda has known its power for 4,000 years. Here's how to use it properly.",
                Content = "<p>Turmeric (<em>Curcuma longa</em>) is perhaps the most studied spice on earth. It features in over 12,000 peer-reviewed research papers. Yet Ayurveda has prescribed it — as <em>Haridra</em> — for virtually every condition imaginable for over four millennia.</p><h2>Why Curcumin Is Only Part of the Story</h2><p>Western research initially isolated curcumin (turmeric's primary bioactive) and found it poorly absorbed on its own. Ayurveda, however, always combined turmeric with black pepper (<em>piperine</em>), fats (usually ghee), and heat — a combination that increases curcumin bioavailability by up to 2,000%.</p><h2>Evidence-Based Uses</h2><ul><li><strong>Inflammation:</strong> Works by the same mechanism as many pharmaceutical anti-inflammatories (COX-2 inhibition) without the side effects.</li><li><strong>Joint health:</strong> Multiple RCTs show comparable results to ibuprofen for knee osteoarthritis pain with far fewer adverse effects.</li><li><strong>Liver protection:</strong> Increases bile production and protects hepatic cells from oxidative damage.</li><li><strong>Mood and cognition:</strong> Emerging research shows curcumin crosses the blood-brain barrier and may reduce depression and increase BDNF (brain-derived neurotrophic factor).</li></ul><h2>Golden Milk: The Perfect Delivery System</h2><p>Mix 1/2 tsp turmeric, 1/4 tsp black pepper, 1/2 tsp ginger, and 1 tsp ghee in 250ml warm full-fat milk. This single preparation delivers turmeric in its most bioavailable form, as Ayurveda intended.</p>",
                CoverImageUrl = "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&w=800&q=80",
                PublishedAt = now.AddDays(-22),
                SortOrder = 5,
                IsActive = true,
                CreatedAt = now.AddDays(-22)
            },
            new EcommerceApp.Domain.Entities.BlogPost
            {
                Title = "Triphala: The Tridoshic Digestive Tonic Ayurveda Swears By",
                Slug = "triphala-tridoshic-digestive-tonic",
                Category = "Digestion",
                Author = "Dr. Kavita Nair",
                Excerpt = "Triphala — literally 'three fruits' — is the most celebrated formula in Ayurveda. Gentle enough for daily use, powerful enough to address constipation, weight, and even eye health.",
                Content = "<p>If you could add only one Ayurvedic supplement to your routine, most Vaidyas (Ayurvedic physicians) would recommend <em>Triphala</em>. The formula consists of equal parts of three dried fruits: Amalaki (<em>Emblica officinalis</em>), Bibhitaki (<em>Terminalia bellirica</em>), and Haritaki (<em>Terminalia chebula</em>).</p><h2>Why Three Fruits?</h2><p>Each fruit targets one of the three doshas: Amalaki balances Pitta, Bibhitaki balances Kapha, and Haritaki balances Vata. Together they produce a formula that is <em>tridoshic</em> — suitable for all constitutional types.</p><h2>The Science of Triphala</h2><p>Modern research has confirmed over 200 bioactive compounds in Triphala, including gallic acid, ellagic acid, and chebulinic acid. Key findings include:</p><ul><li>Prebiotic activity that feeds beneficial gut bacteria</li><li>Gentle laxative effect without the dependency associated with stimulant laxatives</li><li>Anti-inflammatory and antioxidant properties comparable to Vitamin C</li><li>Emerging evidence for anti-cancer properties in cervical, prostate, and colon cells</li><li>Traditional use as an eye wash (Triphala decoction) validated by studies showing reduced intraocular pressure</li></ul><h2>How to Take It</h2><p>The traditional dosage is 1/2 to 1 teaspoon of Triphala churna (powder) in warm water before bed. Give it a full month before judging results — like all Ayurvedic formulas, its action is gentle and cumulative.</p>",
                CoverImageUrl = "https://images.unsplash.com/photo-1498579397066-22750a3cb424?auto=format&fit=crop&w=800&q=80",
                PublishedAt = now.AddDays(-28),
                SortOrder = 6,
                IsActive = true,
                CreatedAt = now.AddDays(-28)
            },
            new EcommerceApp.Domain.Entities.BlogPost
            {
                Title = "Herbal Teas for Your Dosha: A Complete Seasonal Guide",
                Slug = "herbal-teas-for-your-dosha-seasonal-guide",
                Category = "Herbal Teas",
                Author = "Dr. Priya Sharma",
                Excerpt = "The right herbal tea at the right time of day and season can be profoundly medicinal. This guide matches herbs to doshas, seasons, and time of day for maximum therapeutic benefit.",
                Content = "<p>In Ayurveda, every herb has a <em>rasa</em> (taste), a <em>virya</em> (heating or cooling energy), and a <em>vipaka</em> (post-digestive effect). The right tea addresses not just taste but constitutional need and seasonal context.</p><h2>Vata-Pacifying Teas (Autumn & Early Winter)</h2><p>Vata, cold and dry by nature, needs warming, grounding, and hydrating teas.</p><ul><li><strong>Ashwagandha Chai:</strong> Ashwagandha root, cinnamon, cardamom, ginger, black pepper, and milk. The ultimate Vata nerve tonic.</li><li><strong>Licorice & Tulsi:</strong> Deeply nourishing for the adrenals and respiratory tract. Soothing for frazzled Vata nerves.</li></ul><h2>Pitta-Pacifying Teas (Summer & Early Autumn)</h2><p>Pitta runs hot. It needs cooling, bitter, and sweet herbs.</p><ul><li><strong>Rose, Hibiscus & Mint:</strong> Cooling, astringent, and anti-inflammatory. Beautiful to look at and powerfully cooling.</li><li><strong>Brahmi & Coriander:</strong> Calms the sharp Pitta mind without dulling it.</li></ul><h2>Kapha-Pacifying Teas (Winter & Spring)</h2><p>Kapha is heavy and cold. It needs stimulating, pungent, and warming herbs.</p><ul><li><strong>Trikatu Spice Tea:</strong> Dry ginger, black pepper, and long pepper — the classic Kapha-busting combination.</li><li><strong>Tulsi, Ginger & Clove:</strong> A powerful decongestant that also kindles digestive fire.</li></ul>",
                CoverImageUrl = "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?auto=format&fit=crop&w=800&q=80",
                PublishedAt = now.AddDays(-35),
                SortOrder = 7,
                IsActive = true,
                CreatedAt = now.AddDays(-35)
            },
            new EcommerceApp.Domain.Entities.BlogPost
            {
                Title = "Shatavari: Ayurveda's Premier Herb for Women's Wellness",
                Slug = "shatavari-ayurveda-herb-womens-wellness",
                Category = "Women's Health",
                Author = "Dr. Kavita Nair",
                Excerpt = "Shatavari — meaning 'she who possesses a hundred husbands' — is Ayurveda's most revered rasayana for women. From hormonal balance to fertility, lactation, and menopause, it supports every stage of life.",
                Content = "<p><em>Shatavari</em> (Asparagus racemosus) is considered the female equivalent of Ashwagandha in terms of its broad-spectrum adaptogenic effects. The name translates roughly to 'she who possesses a hundred husbands', referring to the plant's traditional reputation for conferring fertility and vitality.</p><h2>Key Benefits Across Life Stages</h2><h3>Reproductive Years</h3><p>Shatavari's phytoestrogens regulate the menstrual cycle and reduce PMS symptoms including cramping, bloating, and mood fluctuations. It acts as a uterine tonic, preparing the endometrium for successful implantation.</p><h3>Pregnancy & Lactation</h3><p>One of the safest Ayurvedic herbs during pregnancy, Shatavari is traditionally used in the third trimester to prepare the body for birth. Post-partum, it is the primary galactagogue (milk-promoting herb) in Ayurveda, shown in clinical studies to significantly increase prolactin levels.</p><h3>Perimenopause & Menopause</h3><p>Clinical trials have demonstrated that Shatavari extract (500mg twice daily) significantly reduces hot flushes, night sweats, and vaginal dryness by supporting oestrogen-like activity without the risks associated with HRT.</p><h2>How to Use</h2><p>The traditional preparation is Shatavari Kalpa — Shatavari powder cooked in milk with honey and ghee. 1–2 teaspoons daily provides a therapeutic dose. Look for standardized extracts containing at least 5% saponins.</p>",
                CoverImageUrl = "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=800&q=80",
                PublishedAt = now.AddDays(-40),
                SortOrder = 8,
                IsActive = true,
                CreatedAt = now.AddDays(-40)
            },
            new EcommerceApp.Domain.Entities.BlogPost
            {
                Title = "Brahmi: The Brain Herb Ayurveda Has Known for 3,000 Years",
                Slug = "brahmi-brain-herb-cognitive-health",
                Category = "Cognitive Health",
                Author = "Dr. Arjun Mehta",
                Excerpt = "Brahmi (Bacopa monnieri) has been used by Ayurvedic practitioners for millennia to enhance memory, sharpen intellect, and calm anxiety. Modern neuroscience is finally catching up.",
                Content = "<p>Brahmi (<em>Bacopa monnieri</em>) takes its name from Brahma, the Hindu god of creation, reflecting the traditional esteem in which this small, creeping herb is held for its effects on the brain and consciousness.</p><h2>The Neuroscience of Brahmi</h2><p>Active compounds in Brahmi — bacosides A and B — have been shown to:</p><ul><li>Enhance synaptic communication by increasing the production of proteins involved in neural plasticity</li><li>Reduce beta-amyloid plaque accumulation (a hallmark of Alzheimer's disease)</li><li>Increase cerebral blood flow and brain-derived neurotrophic factor (BDNF)</li><li>Modulate serotonin, dopamine, and acetylcholine signalling</li></ul><h2>Clinical Evidence</h2><p>A landmark double-blind, placebo-controlled trial at the University of Wollongong found that 300mg of Bacopa monnieri extract daily for 12 weeks significantly improved learning rate, memory consolidation, and information-processing speed in healthy adults.</p><h2>Traditional Use vs Modern Dosing</h2><p>Traditionally, Brahmi was consumed as a ghee-fried preparation with black pepper (to increase fat-soluble bacoside absorption), or as a fresh juice. Modern standardised extracts (300mg, standardised to 55% bacosides) are the most research-validated form. Note: unlike stimulants, Brahmi's effects are cumulative — allow 4–8 weeks to notice significant cognitive improvement.</p>",
                CoverImageUrl = "https://images.unsplash.com/photo-1505236858219-8359eb29e329?auto=format&fit=crop&w=800&q=80",
                PublishedAt = now.AddDays(-47),
                SortOrder = 9,
                IsActive = true,
                CreatedAt = now.AddDays(-47)
            },
            new EcommerceApp.Domain.Entities.BlogPost
            {
                Title = "Panchakarma: The Ultimate Ayurvedic Detox Explained",
                Slug = "panchakarma-ayurvedic-detox-explained",
                Category = "Detox & Cleansing",
                Author = "Dr. Priya Sharma",
                Excerpt = "Panchakarma — the five-action cleanse — is the pinnacle of Ayurvedic medicine. Far more than a detox, it is a complete biological reset that addresses the root cause of chronic disease.",
                Content = "<p>Panchakarma (Sanskrit: <em>pancha</em> = five, <em>karma</em> = action) is the most comprehensive detoxification and rejuvenation programme in Ayurvedic medicine. Unlike modern detox trends that merely stimulate elimination, Panchakarma first loosens and mobilises deeply lodged toxins (Ama), then moves them to the digestive tract for safe removal.</p><h2>The Five Actions</h2><ol><li><strong>Vamana (Therapeutic Emesis)</strong> — Used primarily for Kapha-related conditions like chronic congestion, asthma, and obesity. Carefully supervised oral administration of an emetic herb followed by gentle purging of the upper digestive tract and respiratory system.</li><li><strong>Virechana (Purgation)</strong> — The most commonly administered Panchakarma therapy, targeting Pitta-related conditions including skin diseases, liver disorders, and hyperacidity. Medicated ghee is administered for several days before a controlled purgation.</li><li><strong>Basti (Medicated Enema)</strong> — Considered the most powerful of the five, Basti directly addresses Vata in the colon — the seat of Vata — through the administration of medicated oils and herbal decoctions.</li><li><strong>Nasya (Nasal Administration)</strong> — Medicated oils and herbal preparations administered through the nasal passages to cleanse and heal the head and neck region.</li><li><strong>Raktamokshana (Blood Purification)</strong> — The rarest Panchakarma action, used in very specific conditions involving deep-seated blood toxicity or Pitta-related skin disorders.</li></ol><h2>Modern Research</h2><p>Clinical studies on Panchakarma have shown significant reductions in polychlorinated biphenyls (PCBs) and other lipid-soluble environmental toxins — which conventional medicine has no equivalent treatment for.</p>",
                CoverImageUrl = "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=800&q=80",
                PublishedAt = now.AddDays(-55),
                SortOrder = 10,
                IsActive = true,
                CreatedAt = now.AddDays(-55)
            }
        });
        db.SaveChanges();
    }


}

app.Run();

// lets the integration tests start the real application
public partial class Program { }
