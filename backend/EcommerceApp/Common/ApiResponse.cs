namespace EcommerceApp.Application.Common;

public class ApiResponse<T>
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
    public T? Data { get; set; }
    public List<string>? Errors { get; set; }
    public int StatusCode { get; set; }

    public static ApiResponse<T> Ok(T data, string message = "Success") =>
        new() { Success = true, Data = data, Message = message, StatusCode = 200 };

    public static ApiResponse<T> Created(T data, string message = "Created successfully") =>
        new() { Success = true, Data = data, Message = message, StatusCode = 201 };

    public static ApiResponse<T> Fail(string message, int statusCode = 400, List<string>? errors = null) =>
        new() { Success = false, Message = message, StatusCode = statusCode, Errors = errors };

    public static ApiResponse<T> NotFound(string message = "Resource not found") =>
        new() { Success = false, Message = message, StatusCode = 404 };

    public static ApiResponse<T> Unauthorized(string message = "Unauthorized") =>
        new() { Success = false, Message = message, StatusCode = 401 };
}

public class PagedResult<T>
{
    public IEnumerable<T> Items { get; set; } = [];
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalPages => (int)Math.Ceiling((double)TotalCount / PageSize);
    public bool HasNextPage => Page < TotalPages;
    public bool HasPreviousPage => Page > 1;
}

public class PaginationParams
{
    private int _pageSize = 20;
    private const int MaxPageSize = 100;

    public int Page { get; set; } = 1;
    public int PageSize
    {
        get => _pageSize;
        set => _pageSize = value > MaxPageSize ? MaxPageSize : value;
    }
    public string? Search { get; set; }
    public string? SortBy { get; set; }
    public string SortDirection { get; set; } = "asc";
}
