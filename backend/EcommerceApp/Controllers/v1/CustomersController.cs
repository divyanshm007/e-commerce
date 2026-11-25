using EcommerceApp.Application.Common;
using EcommerceApp.Application.DTOs.Auth;
using EcommerceApp.Application.DTOs.Customers;
using EcommerceApp.Application.Interfaces;
using EcommerceApp.Domain.Entities;
using EcommerceApp.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EcommerceApp.API.Controllers.v1;

[Authorize]
public class CustomersController : BaseController
{
    private readonly AppDbContext _db;

    public CustomersController(AppDbContext db)
    {
        _db = db;
    }

    // Admin: list all customers
    [HttpGet]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> GetAll([FromQuery] PaginationParams paging)
    {
        var query = _db.Users
            .Where(u => u.Role == Domain.Enums.UserRole.Customer)
            .Include(u => u.Orders);

        if (!string.IsNullOrWhiteSpace(paging.Search))
            query = (Microsoft.EntityFrameworkCore.Query.IIncludableQueryable<User, System.Collections.Generic.ICollection<Order>>)query.Where(u =>
                u.Email.Contains(paging.Search) ||
                u.FirstName.Contains(paging.Search) ||
                u.LastName.Contains(paging.Search));

        var total = await query.CountAsync();
        var users = await query
            .OrderByDescending(u => u.CreatedAt)
            .Skip((paging.Page - 1) * paging.PageSize)
            .Take(paging.PageSize)
            .AsNoTracking()
            .ToListAsync();

        var dtos = users.Select(u => new CustomerListDto
        {
            Id = u.Id,
            FullName = $"{u.FirstName} {u.LastName}",
            Email = u.Email,
            Phone = u.Phone,
            OrderCount = u.Orders.Count,
            TotalSpent = u.Orders.Where(o => o.PaymentStatus == Domain.Enums.PaymentStatus.Paid).Sum(o => o.TotalAmount),
            CreatedAt = u.CreatedAt,
            LastLoginAt = u.LastLoginAt,
            IsActive = u.IsActive
        }).ToList();

        return Ok(new PagedResult<CustomerListDto>
        {
            Items = dtos, TotalCount = total, Page = paging.Page, PageSize = paging.PageSize
        });
    }

    // Admin: get customer detail
    [HttpGet("{id:guid}")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var user = await _db.Users
            .Include(u => u.Orders)
            .Include(u => u.Addresses)
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == id);

        if (user == null) return NotFound();

        return Ok(new CustomerDetailDto
        {
            Id = user.Id,
            FullName = $"{user.FirstName} {user.LastName}",
            Email = user.Email,
            Phone = user.Phone,
            OrderCount = user.Orders.Count,
            TotalSpent = user.Orders.Where(o => o.PaymentStatus == Domain.Enums.PaymentStatus.Paid).Sum(o => o.TotalAmount),
            CreatedAt = user.CreatedAt,
            LastLoginAt = user.LastLoginAt,
            IsActive = user.IsActive,
            Addresses = user.Addresses.Select(a => new CustomerAddressDto
            {
                Id = a.Id,
                FullName = a.FullName, Phone = a.Phone,
                Line1 = a.Line1, Line2 = a.Line2,
                City = a.City, State = a.State,
                PostalCode = a.PostalCode, Country = a.Country,
                AddressType = a.AddressType, IsDefault = a.IsDefault
            }).ToList(),
            RecentOrders = user.Orders.OrderByDescending(o => o.CreatedAt).Take(10).Select(o =>
                new CustomerOrderSummaryDto
                {
                    Id = o.Id, OrderNumber = o.OrderNumber,
                    TotalAmount = o.TotalAmount, Status = o.Status, CreatedAt = o.CreatedAt
                }).ToList()
        });
    }

    [HttpPatch("{id:guid}/toggle-active")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> ToggleActive(Guid id)
    {
        var user = await _db.Users.FindAsync(id);
        if (user == null) return NotFound();
        user.IsActive = !user.IsActive;
        await _db.SaveChangesAsync();
        return Ok(new { isActive = user.IsActive });
    }

    // Customer: manage their own addresses
    [HttpGet("addresses")]
    [Authorize(Roles = "Customer")]
    public async Task<IActionResult> GetAddresses() =>
        Ok(await _db.Addresses.Where(a => a.UserId == CurrentUserId).ToListAsync());

    [HttpPost("addresses")]
    [Authorize(Roles = "Customer")]
    public async Task<IActionResult> AddAddress([FromBody] CreateAddressDto dto)
    {
        if (dto.IsDefault)
        {
            var existing = await _db.Addresses
                .Where(a => a.UserId == CurrentUserId && a.AddressType == dto.AddressType && a.IsDefault)
                .ToListAsync();
            existing.ForEach(a => a.IsDefault = false);
        }

        var address = new Address
        {
            UserId = CurrentUserId,
            FullName = dto.FullName, Phone = dto.Phone,
            Line1 = dto.Line1, Line2 = dto.Line2,
            City = dto.City, State = dto.State,
            PostalCode = dto.PostalCode, Country = dto.Country,
            AddressType = dto.AddressType, IsDefault = dto.IsDefault
        };

        await _db.Addresses.AddAsync(address);
        await _db.SaveChangesAsync();
        return Ok(address);
    }

    [HttpDelete("addresses/{addressId:guid}")]
    [Authorize(Roles = "Customer")]
    public async Task<IActionResult> DeleteAddress(Guid addressId)
    {
        var address = await _db.Addresses.FirstOrDefaultAsync(a =>
            a.Id == addressId && a.UserId == CurrentUserId);
        if (address == null) return NotFound();
        _db.Addresses.Remove(address);
        await _db.SaveChangesAsync();
        return Ok();
    }
}
