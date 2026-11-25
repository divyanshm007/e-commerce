using EcommerceApp.Domain.Common;

namespace EcommerceApp.Domain.Entities;

public class TaxConfig : BaseEntity
{
    public string Name { get; set; } = "GST";
    public decimal Percentage { get; set; } = 18;
    public bool IsApplicable { get; set; } = true;
}
