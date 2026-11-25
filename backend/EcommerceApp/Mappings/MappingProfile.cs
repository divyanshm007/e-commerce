using AutoMapper;
using EcommerceApp.Application.DTOs.Auth;
using EcommerceApp.Application.DTOs.Cart;
using EcommerceApp.Application.DTOs.Categories;
using EcommerceApp.Application.DTOs.Coupons;
using EcommerceApp.Application.DTOs.Customers;
using EcommerceApp.Application.DTOs.Dashboard;
using EcommerceApp.Application.DTOs.Orders;
using EcommerceApp.Application.DTOs.Payments;
using EcommerceApp.Application.DTOs.Products;
using EcommerceApp.Application.DTOs.Reviews;
using EcommerceApp.Application.DTOs.Settings;
using EcommerceApp.Domain.Entities;

namespace EcommerceApp.Application.Mappings;

public class MappingProfile : Profile
{
    public MappingProfile()
    {
        // User / Auth
        CreateMap<User, UserProfileDto>();
        CreateMap<UpdateProfileDto, User>();

        // Category
        CreateMap<Category, CategoryDto>()
            .ForMember(d => d.ParentCategoryName, o => o.MapFrom(s => s.ParentCategory != null ? s.ParentCategory.Name : null))
            .ForMember(d => d.ProductCount, o => o.MapFrom(s => s.Products.Count));
        CreateMap<CreateCategoryDto, Category>();
        CreateMap<UpdateCategoryDto, Category>();

        // Product
        CreateMap<Product, ProductListDto>()
            .ForMember(d => d.CategoryName, o => o.MapFrom(s => s.Category != null ? s.Category.Name : null))
            .ForMember(d => d.PrimaryImageUrl, o => o.MapFrom<PrimaryImageUrlResolver>());

        CreateMap<Product, ProductDetailDto>()
            .IncludeBase<Product, ProductListDto>();

        CreateMap<ProductImage, ProductImageDto>()
            .ForMember(d => d.ImageUrl, o => o.MapFrom<ProductImageUrlResolver>());
        CreateMap<ProductVariant, ProductVariantDto>();
        CreateMap<CreateProductDto, Product>();
        CreateMap<UpdateProductDto, Product>();
        CreateMap<CreateProductVariantDto, ProductVariant>();

        // Order
        CreateMap<Order, OrderListDto>()
            .ForMember(d => d.CustomerName, o => o.MapFrom(s =>
                s.User != null ? $"{s.User.FirstName} {s.User.LastName}" : s.GuestName))
            .ForMember(d => d.CustomerEmail, o => o.MapFrom(s =>
                s.User != null ? s.User.Email : s.GuestEmail))
            .ForMember(d => d.ItemCount, o => o.MapFrom(s => s.Items.Count));

        CreateMap<Order, OrderDetailDto>()
            .IncludeBase<Order, OrderListDto>()
            .ForMember(d => d.ShippingAddress, o => o.MapFrom(s => new AddressSnapshotDto
            {
                FullName = s.ShippingFullName, Phone = s.ShippingPhone,
                Line1 = s.ShippingLine1, Line2 = s.ShippingLine2,
                City = s.ShippingCity, State = s.ShippingState,
                PostalCode = s.ShippingPostalCode, Country = s.ShippingCountry
            }))
            .ForMember(d => d.BillingAddress, o => o.MapFrom(s => new AddressSnapshotDto
            {
                FullName = s.BillingFullName, Phone = s.BillingPhone,
                Line1 = s.BillingLine1, Line2 = s.BillingLine2,
                City = s.BillingCity, State = s.BillingState,
                PostalCode = s.BillingPostalCode, Country = s.BillingCountry
            }));

        CreateMap<OrderItem, OrderItemDto>();
        CreateMap<Payment, PaymentSummaryDto>();

        // Cart
        CreateMap<CartItem, CartItemDto>()
            .ForMember(d => d.ProductName, o => o.MapFrom(s => s.Product.Name))
            .ForMember(d => d.ProductSlug, o => o.MapFrom(s => s.Product.Slug))
            .ForMember(d => d.ProductImageUrl, o => o.MapFrom(s =>
                s.Product.Images != null
                    ? (s.Product.Images.FirstOrDefault(i => i.IsPrimary) ?? s.Product.Images.FirstOrDefault())!.ImageUrl
                    : null))
            .ForMember(d => d.UnitPrice, o => o.MapFrom(s => s.Product.Price))
            .ForMember(d => d.DiscountPrice, o => o.MapFrom(s => s.Product.DiscountPrice ?? s.Product.Price))
            .ForMember(d => d.TaxPercentage, o => o.MapFrom(s => s.Product.TaxPercentage))
            .ForMember(d => d.StockQuantity, o => o.MapFrom(s => s.Product.StockQuantity))
            .ForMember(d => d.InStock, o => o.MapFrom(s => s.Product.StockQuantity > 0));

        // Coupon
        CreateMap<Coupon, CouponDto>();
        CreateMap<CreateCouponDto, Coupon>();
        CreateMap<UpdateCouponDto, Coupon>();

        // Review
        CreateMap<Review, ReviewDto>()
            .ForMember(d => d.CustomerName, o => o.MapFrom(s => s.User != null ? $"{s.User.FirstName} {s.User.LastName}".Trim() : "Anonymous"))
            .ForMember(d => d.ProductName, o => o.MapFrom(s => s.Product != null ? s.Product.Name : ""));
        CreateMap<Review, ReviewSummaryDto>()
            .ForMember(d => d.CustomerName, o => o.MapFrom(s => s.User != null ? $"{s.User.FirstName} {s.User.LastName}".Trim() : "Anonymous"));

        // Payment
        CreateMap<Payment, PaymentListDto>()
            .ForMember(d => d.OrderNumber, o => o.MapFrom(s => s.Order.OrderNumber))
            .ForMember(d => d.CustomerName, o => o.MapFrom(s =>
                s.Order.User != null
                    ? $"{s.Order.User.FirstName} {s.Order.User.LastName}"
                    : s.Order.GuestName));
        CreateMap<Payment, PaymentDetailDto>().IncludeBase<Payment, PaymentListDto>();

        // Customer
        CreateMap<User, CustomerListDto>()
            .ForMember(d => d.FullName, o => o.MapFrom(s => $"{s.FirstName} {s.LastName}"))
            .ForMember(d => d.OrderCount, o => o.MapFrom(s => s.Orders.Count))
            .ForMember(d => d.TotalSpent, o => o.MapFrom(s => s.Orders.Sum(o => o.TotalAmount)));

        CreateMap<User, CustomerDetailDto>()
            .IncludeBase<User, CustomerListDto>();

        CreateMap<Address, CustomerAddressDto>();

        CreateMap<Order, CustomerOrderSummaryDto>();

        // Settings
        CreateMap<ShippingConfig, ShippingConfigDto>();
        CreateMap<TaxConfig, TaxConfigDto>();

        // Dashboard
        CreateMap<Order, OrderListItemDto>()
            .ForMember(d => d.CustomerName, o => o.MapFrom(s =>
                s.User != null ? $"{s.User.FirstName} {s.User.LastName}" : s.GuestName))
            .ForMember(d => d.CustomerEmail, o => o.MapFrom(s =>
                s.User != null ? s.User.Email : s.GuestEmail))
            .ForMember(d => d.Status, o => o.MapFrom(s => s.Status.ToString()));

        CreateMap<Product, BestSellerDto>()
            .ForMember(d => d.ProductId, o => o.MapFrom(s => s.Id))
            .ForMember(d => d.ImageUrl, o => o.MapFrom<BestSellerImageUrlResolver>());

        CreateMap<Product, LowStockDto>()
            .ForMember(d => d.ProductId, o => o.MapFrom(s => s.Id))
            .ForMember(d => d.ImageUrl, o => o.MapFrom<LowStockImageUrlResolver>());
    }
}
