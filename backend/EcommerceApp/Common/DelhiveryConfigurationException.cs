namespace EcommerceApp.Application.Common;

/// <summary>
/// The Delhivery configuration cannot be trusted (for example the stored mode is neither 'test' nor 'live'). Callers must stop
/// and report it – never guess an environment. The message never contains a token.
/// </summary>
public class DelhiveryConfigurationException : Exception
{
    public DelhiveryConfigurationException(string message) : base(message) { }
}
