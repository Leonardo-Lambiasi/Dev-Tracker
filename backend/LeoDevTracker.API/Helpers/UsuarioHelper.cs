using System.Security.Claims;

namespace LeoDevTracker.API.Helpers
{
    public static class UsuarioHelper
    {
        public static string? GetUsuario(ClaimsPrincipal user) =>
            user.FindFirstValue(ClaimTypes.Name);
    }
}
