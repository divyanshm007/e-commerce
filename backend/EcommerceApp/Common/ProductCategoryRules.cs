

namespace EcommerceApp.Domain.Entities;

/// <summary>The categories of a product: the main one (Product.CategoryId) plus any extra rows in ProductCategories.</summary>
public static class ProductCategoryRules
{
    public static List<Guid> AllIds(Product p)
    {
        var ids = new List<Guid>();
        if (p.CategoryId.HasValue) ids.Add(p.CategoryId.Value);
        foreach (var pc in p.ProductCategories) if (!ids.Contains(pc.CategoryId)) ids.Add(pc.CategoryId);
        return ids;
    }

    public static List<string> AllNames(Product p)
    {
        var names = new List<string>();
        if (p.CategoryId.HasValue && p.Category != null) names.Add(p.Category.Name);
        foreach (var pc in p.ProductCategories)
            if (pc.CategoryId != p.CategoryId && pc.Category != null && !names.Contains(pc.Category.Name)) names.Add(pc.Category.Name);
        return names;
    }

    /// <summary>The ids the admin chose: distinct, the first is the main category. Falls back to the single CategoryId.</summary>
    public static List<Guid> Chosen(Guid? categoryId, List<Guid>? categoryIds)
    {
        var list = (categoryIds ?? []).Where(x => x != Guid.Empty).Distinct().ToList();
        if (list.Count == 0 && categoryId.HasValue && categoryId.Value != Guid.Empty) list.Add(categoryId.Value);
        return list;
    }
}
