using EcommerceApp.Application.Interfaces;
using EcommerceApp.Infrastructure.Data;
using EcommerceApp.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace EcommerceApp.Infrastructure.Extensions;

public static class ServiceExtensions
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        services.AddDbContext<AppDbContext>(options =>
            options.UseNpgsql(configuration.GetConnectionString("DefaultConnection"),
                npg => npg.MigrationsAssembly("EcommerceApp")));

        services.AddScoped<ITokenService, TokenService>();
        services.AddScoped<ISlugService, SlugService>();
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IProductService, ProductService>();
        services.AddScoped<ICategoryService, CategoryService>();
        services.AddScoped<IOrderShipmentGuard, ShipmentOrderGuard>();
        services.AddScoped<IDelhiveryConfigService, DelhiveryConfigService>();
        services.Configure<EcommerceApp.Infrastructure.Services.Delhivery.DelhiveryClientOptions>(configuration.GetSection("Delhivery:Client"));
        // the only HTTP client for Delhivery: no redirects are followed, so a request can never be sent on to another host
        services.AddHttpClient<IDelhiveryClient, EcommerceApp.Infrastructure.Services.Delhivery.DelhiveryClient>(c => c.Timeout = TimeSpan.FromSeconds(60))
            .ConfigurePrimaryHttpMessageHandler(() => new System.Net.Http.SocketsHttpHandler { AllowAutoRedirect = false });
        // automated fulfilment: approval service, background worker and its wake-up signal
        services.Configure<EcommerceApp.Infrastructure.Services.Fulfilment.FulfilmentOptions>(configuration.GetSection("Delhivery:Fulfilment"));
        services.AddSingleton<EcommerceApp.Infrastructure.Services.Fulfilment.FulfilmentSignal>();
        services.AddSingleton<IFulfilmentSignal>(sp => sp.GetRequiredService<EcommerceApp.Infrastructure.Services.Fulfilment.FulfilmentSignal>());
        services.AddScoped<IFulfilmentService, EcommerceApp.Infrastructure.Services.Fulfilment.FulfilmentService>();
        services.AddScoped<EcommerceApp.Infrastructure.Services.Fulfilment.FulfilmentProcessor>();
        services.AddHostedService<EcommerceApp.Infrastructure.Services.Fulfilment.FulfilmentWorker>();
        services.AddScoped<ICancellationService, CancellationService>();
        services.AddHostedService<AbandonedPaymentWorker>();
        services.AddScoped<IOrderService, OrderService>();
        services.AddScoped<ICartService, CartService>();
        services.AddHttpClient();
        services.AddScoped<IRazorpayConfigService, RazorpayConfigService>();
        services.AddScoped<IPaymentService, PaymentService>();
        services.AddScoped<IReviewService, ReviewService>();
        services.AddScoped<ICouponService, CouponService>();
        services.AddScoped<IDashboardService, DashboardService>();
        services.AddScoped<ISettingsService, SettingsService>();
        services.AddScoped<IEmailService, EmailService>();

        return services;
    }
}
