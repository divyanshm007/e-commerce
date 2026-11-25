using System.Text.RegularExpressions;

namespace EcommerceApp.Infrastructure.Services;

public interface ISlugService
{
    string Generate(string text);
    string GenerateUnique(string text, IEnumerable<string> existingSlugs);
}

public class SlugService : ISlugService
{
    public string Generate(string text)
    {
        var slug = text.ToLowerInvariant();
        slug = Regex.Replace(slug, @"[^a-z0-9\s-]", "");
        slug = Regex.Replace(slug, @"\s+", "-");
        slug = Regex.Replace(slug, @"-+", "-").Trim('-');
        return slug;
    }

    public string GenerateUnique(string text, IEnumerable<string> existingSlugs)
    {
        var base_ = Generate(text);
        var slug = base_;
        var counter = 1;
        var existing = existingSlugs.ToHashSet();
        while (existing.Contains(slug))
        {
            slug = $"{base_}-{counter++}";
        }
        return slug;
    }
}
