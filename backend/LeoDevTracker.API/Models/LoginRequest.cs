namespace LeoDevTracker.API.Models
{
    public record LoginRequest(string Usuario, string Senha);
    public record LoginResponse(string Token, string Usuario, DateTime Expiracao);
}
