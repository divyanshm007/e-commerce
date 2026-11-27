using System.Net;
using EcommerceApp.Domain.Entities;
using EcommerceApp.Tests.Support;
using Microsoft.EntityFrameworkCore;

namespace EcommerceApp.Tests;

/// <summary>A product can sit in several categories, and shows up under each of them on the website.</summary>
public class ProductCategoriesTests : IClassFixture<ApiFixture>
{
    private readonly ApiFixture _f;
    public ProductCategoriesTests(ApiFixture f) => _f = f;

    private async Task<Category> CategoryAsync(string name)
    {
        await using var db = _f.Db.NewContext();
        var c = new Category { Name = name, Slug = name.ToLower().Replace(' ', '-') + "-" + Guid.NewGuid().ToString("N")[..6], IsActive = true };
        db.Categories.Add(c);
        await db.SaveChangesAsync();
        return c;
    }

    private static object NewProduct(string name, Guid[] categoryIds) => new
    {
        name, price = 120, stockQuantity = 5, categoryIds, variants = Array.Empty<object>()
    };

    private async Task<string[]> NamesInCategoryAsync(Guid categoryId)
    {
        var res = await _f.Api.SendAsync(HttpMethod.Get, $"/api/v1/products?categoryId={categoryId}&pageSize=50");
        Assert.Equal(HttpStatusCode.OK, res.Status);
        return res.Body.GetProperty("data").GetProperty("items").EnumerateArray().Select(x => x.GetProperty("name").GetString()!).ToArray();
    }

    [Fact]
    public async Task A_product_with_two_categories_is_listed_under_both_and_the_first_is_the_main_one()
    {
        var a = await CategoryAsync("Multi Cat A"); var b = await CategoryAsync("Multi Cat B"); var other = await CategoryAsync("Multi Cat Other");
        var created = await _f.Api.SendAsync(HttpMethod.Post, "/api/v1/products", _f.AdminToken, NewProduct("Multi Cat Product", [a.Id, b.Id]));
        Assert.Equal(HttpStatusCode.OK, created.Status);
        var data = created.Body.GetProperty("data");
        Assert.Equal(a.Id, data.GetProperty("categoryId").GetGuid());                                   // first = main
        Assert.Equal(new[] { a.Id, b.Id }, data.GetProperty("categoryIds").EnumerateArray().Select(x => x.GetGuid()).ToArray());
        Assert.Contains("Multi Cat Product", await NamesInCategoryAsync(a.Id));
        Assert.Contains("Multi Cat Product", await NamesInCategoryAsync(b.Id));
        Assert.DoesNotContain("Multi Cat Product", await NamesInCategoryAsync(other.Id));
    }

    [Fact]
    public async Task Editing_the_categories_adds_and_removes_them_and_a_single_category_still_works()
    {
        var a = await CategoryAsync("Edit Cat A"); var b = await CategoryAsync("Edit Cat B"); var c = await CategoryAsync("Edit Cat C");
        var created = await _f.Api.SendAsync(HttpMethod.Post, "/api/v1/products", _f.AdminToken, NewProduct("Edit Cats Product", [a.Id, b.Id]));
        var id = created.Body.GetProperty("data").GetProperty("id").GetGuid();

        var upd = await _f.Api.SendAsync(HttpMethod.Put, $"/api/v1/products/{id}", _f.AdminToken, NewProduct("Edit Cats Product", [b.Id, c.Id]));
        Assert.Equal(HttpStatusCode.OK, upd.Status);
        Assert.Equal(b.Id, upd.Body.GetProperty("data").GetProperty("categoryId").GetGuid());
        Assert.DoesNotContain("Edit Cats Product", await NamesInCategoryAsync(a.Id));                 // removed
        Assert.Contains("Edit Cats Product", await NamesInCategoryAsync(b.Id));
        Assert.Contains("Edit Cats Product", await NamesInCategoryAsync(c.Id));                       // added

        // the older way, one categoryId and no list, still works
        var single = await _f.Api.SendAsync(HttpMethod.Put, $"/api/v1/products/{id}", _f.AdminToken,
            new { name = "Edit Cats Product", price = 120, stockQuantity = 5, categoryId = a.Id, variants = Array.Empty<object>() });
        Assert.Equal(new[] { a.Id }, single.Body.GetProperty("data").GetProperty("categoryIds").EnumerateArray().Select(x => x.GetGuid()).ToArray());
        await using var db = _f.Db.NewContext();
        Assert.Equal(1, await db.ProductCategories.CountAsync(x => x.ProductId == id));
    }

    [Fact]
    public async Task Deleting_a_category_keeps_the_product_in_its_other_categories()
    {
        var a = await CategoryAsync("Del Cat A"); var b = await CategoryAsync("Del Cat B");
        var created = await _f.Api.SendAsync(HttpMethod.Post, "/api/v1/products", _f.AdminToken, NewProduct("Del Cats Product", [a.Id, b.Id]));
        var id = created.Body.GetProperty("data").GetProperty("id").GetGuid();
        Assert.Equal(HttpStatusCode.OK, (await _f.Api.SendAsync(HttpMethod.Delete, $"/api/v1/categories/{b.Id}", _f.AdminToken)).Status);
        Assert.Contains("Del Cats Product", await NamesInCategoryAsync(a.Id));
        await using var db = _f.Db.NewContext();
        Assert.Equal(new[] { a.Id }, await db.ProductCategories.Where(x => x.ProductId == id).Select(x => x.CategoryId).ToArrayAsync());
    }
}
