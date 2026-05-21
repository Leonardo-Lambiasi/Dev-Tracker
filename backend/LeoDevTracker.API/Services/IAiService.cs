namespace LeoDevTracker.API.Services
{
    public interface IAiService
    {
        Task<string> Enviar(string prompt, string modelo, int maxTokens = 1024);
    }
}
