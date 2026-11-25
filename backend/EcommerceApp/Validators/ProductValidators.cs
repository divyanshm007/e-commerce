using EcommerceApp.Application.DTOs.Products;
using FluentValidation;

namespace EcommerceApp.Application.Validators;

public class CreateProductValidator : AbstractValidator<CreateProductDto>
{
    public CreateProductValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(500);
        RuleFor(x => x.Price).GreaterThan(0);
        RuleFor(x => x.DiscountPrice).GreaterThan(0).LessThan(x => x.Price)
            .When(x => x.DiscountPrice.HasValue);
        RuleFor(x => x.TaxPercentage).InclusiveBetween(0, 100);
        RuleFor(x => x.StockQuantity).GreaterThanOrEqualTo(0);
        RuleFor(x => x.Currency).NotEmpty().MaximumLength(10);
    }
}

public class UpdateProductValidator : AbstractValidator<UpdateProductDto>
{
    public UpdateProductValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(500);
        RuleFor(x => x.Price).GreaterThan(0);
        RuleFor(x => x.DiscountPrice).GreaterThan(0).LessThan(x => x.Price)
            .When(x => x.DiscountPrice.HasValue);
        RuleFor(x => x.TaxPercentage).InclusiveBetween(0, 100);
        RuleFor(x => x.StockQuantity).GreaterThanOrEqualTo(0);
    }
}
