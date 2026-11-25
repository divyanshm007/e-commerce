using EcommerceApp.Domain.Common;

namespace EcommerceApp.Domain.Entities;

public class ConsultationRequest : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string Concern { get; set; } = string.Empty;
    public string? PreferredDate { get; set; }
    public string? PreferredTime { get; set; }
    public string? DoshaType { get; set; }
    public ConsultationStatus Status { get; set; } = ConsultationStatus.Pending;
    public string? AdminNotes { get; set; }
}

public enum ConsultationStatus
{
    Pending = 1,
    Confirmed = 2,
    Completed = 3,
    Cancelled = 4
}
