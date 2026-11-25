using AutoMapper;
using EcommerceApp.Application.Common;
using EcommerceApp.Application.DTOs.Reviews;
using EcommerceApp.Application.Interfaces;
using EcommerceApp.Domain.Entities;
using EcommerceApp.Domain.Enums;
using EcommerceApp.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace EcommerceApp.Infrastructure.Services;

public class ReviewService : IReviewService
{
    private readonly AppDbContext _db;
    private readonly IMapper _mapper;
    private readonly IEmailService _emailService;

    public ReviewService(AppDbContext db, IMapper mapper, IEmailService emailService)
    {
        _db = db;
        _mapper = mapper;
        _emailService = emailService;
    }

    private IQueryable<Review> BaseQuery() =>
        _db.Reviews
            .Include(r => r.Product)
            .Include(r => r.User)
            .AsNoTracking();

    public async Task<ApiResponse<PagedResult<ReviewDto>>> GetAllAsync(PaginationParams paging)
    {
        var query = BaseQuery();
        var total = await query.CountAsync();
        var items = await query.OrderByDescending(r => r.CreatedAt)
            .Skip((paging.Page - 1) * paging.PageSize).Take(paging.PageSize).ToListAsync();

        return ApiResponse<PagedResult<ReviewDto>>.Ok(new PagedResult<ReviewDto>
        {
            Items = _mapper.Map<List<ReviewDto>>(items),
            TotalCount = total,
            Page = paging.Page,
            PageSize = paging.PageSize
        });
    }

    public async Task<ApiResponse<List<ReviewDto>>> GetByProductAsync(Guid productId)
    {
        var reviews = await BaseQuery()
            .Where(r => r.ProductId == productId && r.Status == ReviewStatus.Approved)
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync();
        return ApiResponse<List<ReviewDto>>.Ok(_mapper.Map<List<ReviewDto>>(reviews));
    }

    public async Task<ApiResponse<ReviewDto>> CreateAsync(Guid userId, CreateReviewDto dto)
    {
        if (await _db.Reviews.AnyAsync(r => r.ProductId == dto.ProductId && r.UserId == userId))
            return ApiResponse<ReviewDto>.Fail("You have already reviewed this product.");

        var review = new Review
        {
            ProductId = dto.ProductId,
            UserId = userId,
            OrderId = dto.OrderId,
            Rating = dto.Rating,
            Title = dto.Title,
            Comment = dto.Comment,
            Status = ReviewStatus.Pending
        };

        await _db.Reviews.AddAsync(review);
        await _db.SaveChangesAsync();
        await UpdateProductRatingAsync(dto.ProductId);

        var created = await BaseQuery().FirstAsync(r => r.Id == review.Id);

        var user = await _db.Users.FindAsync(userId);
        if (user != null)
        {
            var productName = created.Product?.Name ?? "the product";
            _ = _emailService.SendReviewSubmittedAsync(user.Email, user.FirstName, productName);
            _ = _emailService.SendReviewPendingAdminAsync(user.FirstName, user.Email, productName, review.Comment ?? "");
        }

        return ApiResponse<ReviewDto>.Created(_mapper.Map<ReviewDto>(created));
    }

    public async Task<ApiResponse<string>> ApproveAsync(Guid id)
    {
        var review = await _db.Reviews.Include(r => r.Product).Include(r => r.User).FirstOrDefaultAsync(r => r.Id == id);
        if (review == null) return ApiResponse<string>.NotFound("Review not found.");
        var wasAlreadyApproved = review.Status == ReviewStatus.Approved;
        review.Status = ReviewStatus.Approved;
        review.ApprovedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        await UpdateProductRatingAsync(review.ProductId);
        if (!wasAlreadyApproved && review.User != null)
            _ = _emailService.SendReviewApprovedAsync(review.User.Email, review.User.FirstName, review.Product?.Name ?? "the product");
        return ApiResponse<string>.Ok("Review approved.");
    }

    public async Task<ApiResponse<string>> RejectAsync(Guid id)
    {
        var review = await _db.Reviews.Include(r => r.Product).Include(r => r.User).FirstOrDefaultAsync(r => r.Id == id);
        if (review == null) return ApiResponse<string>.NotFound("Review not found.");
        review.Status = ReviewStatus.Rejected;
        await _db.SaveChangesAsync();
        await UpdateProductRatingAsync(review.ProductId);
        if (review.User != null)
            _ = _emailService.SendReviewRejectedAsync(review.User.Email, review.User.FirstName, review.Product?.Name ?? "the product");
        return ApiResponse<string>.Ok("Review rejected.");
    }

    public async Task<ApiResponse<string>> DeleteAsync(Guid id)
    {
        var review = await _db.Reviews.FindAsync(id);
        if (review == null) return ApiResponse<string>.NotFound("Review not found.");
        var productId = review.ProductId;
        _db.Reviews.Remove(review);
        await _db.SaveChangesAsync();
        await UpdateProductRatingAsync(productId);
        return ApiResponse<string>.Ok("Review deleted.");
    }

    private async Task UpdateProductRatingAsync(Guid productId)
    {
        var approvedReviews = await _db.Reviews
            .Where(r => r.ProductId == productId && r.Status == ReviewStatus.Approved)
            .ToListAsync();

        var product = await _db.Products.FindAsync(productId);
        if (product == null) return;

        product.ReviewCount = approvedReviews.Count;
        product.AverageRating = approvedReviews.Any()
            ? Math.Round(approvedReviews.Average(r => r.Rating), 2)
            : 0;

        await _db.SaveChangesAsync();
    }
}
