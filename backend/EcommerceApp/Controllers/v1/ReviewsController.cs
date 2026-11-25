using EcommerceApp.Application.Common;
using EcommerceApp.Application.DTOs.Reviews;
using EcommerceApp.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EcommerceApp.API.Controllers.v1;

public class ReviewsController : BaseController
{
    private readonly IReviewService _reviewService;

    public ReviewsController(IReviewService reviewService)
    {
        _reviewService = reviewService;
    }

    [HttpGet]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> GetAll([FromQuery] PaginationParams paging) =>
        ApiResult(await _reviewService.GetAllAsync(paging));

    [HttpGet("product/{productId:guid}")]
    public async Task<IActionResult> GetByProduct(Guid productId) =>
        ApiResult(await _reviewService.GetByProductAsync(productId));

    [HttpPost]
    [Authorize(Roles = "Customer")]
    public async Task<IActionResult> Create([FromBody] CreateReviewDto dto) =>
        ApiResult(await _reviewService.CreateAsync(CurrentUserId, dto));

    [HttpPatch("{id:guid}/approve")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> Approve(Guid id) =>
        ApiResult(await _reviewService.ApproveAsync(id));

    [HttpPatch("{id:guid}/reject")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> Reject(Guid id) =>
        ApiResult(await _reviewService.RejectAsync(id));

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> Delete(Guid id) =>
        ApiResult(await _reviewService.DeleteAsync(id));
}
