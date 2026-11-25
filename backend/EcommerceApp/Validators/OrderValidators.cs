using EcommerceApp.Application.DTOs.Orders;
using EcommerceApp.Application.Common;
using FluentValidation;

namespace EcommerceApp.Application.Validators;

public class CreateOrderValidator : AbstractValidator<CreateOrderDto>
{
    public CreateOrderValidator()
    {
        RuleFor(x => x.ShippingAddress).NotNull();
        RuleFor(x => x.BillingAddress).NotNull();
        RuleFor(x => x.Items).NotEmpty().WithMessage("Order must have at least one item.");
        RuleForEach(x => x.Items).ChildRules(i => i.RuleFor(q => q.Quantity).GreaterThan(0).WithMessage("Item quantity must be at least 1."));
        // the courier needs a reachable 10-digit mobile number and a 6-digit PIN code
        RuleFor(x => x.ShippingAddress.Phone).Must(p => ContactNormalizer.TryNormalizePhone(p) != null)
            .WithMessage("Enter a valid 10-digit mobile number.").When(x => x.ShippingAddress != null);
        RuleFor(x => x.ShippingAddress.PostalCode).Must(ContactNormalizer.IsValidPin)
            .WithMessage("Enter a valid 6-digit PIN code.").When(x => x.ShippingAddress != null);
        RuleFor(x => x.BillingAddress.Phone).Must(p => ContactNormalizer.TryNormalizePhone(p) != null)
            .WithMessage("Enter a valid 10-digit mobile number.").When(x => x.BillingAddress != null);
        RuleFor(x => x.BillingAddress.PostalCode).Must(ContactNormalizer.IsValidPin)
            .WithMessage("Enter a valid 6-digit PIN code.").When(x => x.BillingAddress != null);
        // Guest name/email are required only for anonymous callers. Whether the caller is signed in is known
        // from the token (not the request body), so OrdersController enforces that rule.
    }
}
