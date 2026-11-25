using EcommerceApp.Application.Common;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace EcommerceApp.API.Controllers.v1;

[ApiController]
[Route("api/v1/[controller]")]
[Produces("application/json")]
public abstract class BaseController : ControllerBase
{
    protected Guid CurrentUserId =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    protected bool IsAuthenticated =>
        User.Identity?.IsAuthenticated ?? false;

    protected IActionResult ApiResult<T>(ApiResponse<T> response) =>
        StatusCode(response.StatusCode, response);
}
