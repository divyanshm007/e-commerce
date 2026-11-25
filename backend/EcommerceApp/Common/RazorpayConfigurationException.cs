namespace EcommerceApp.Application.Common;

/// <summary>
/// The Razorpay mode setting cannot be trusted (it is neither 'test' nor 'live'). Callers must stop and report it - never guess
/// between test and live keys. The message never contains a key.
/// </summary>
public class RazorpayConfigurationException : Exception
{
    public RazorpayConfigurationException(string message) : base(message) { }
}
