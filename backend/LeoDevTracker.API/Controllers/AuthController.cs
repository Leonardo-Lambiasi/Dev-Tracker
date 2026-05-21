using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using LeoDevTracker.API.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;

namespace LeoDevTracker.API.Controllers
{
    [ApiController]
    [Route("api/auth")]
    public class AuthController : ControllerBase
    {
        private readonly IConfiguration _config;

        public AuthController(IConfiguration config) => _config = config;

        [HttpPost("login")]
        public IActionResult Login(LoginRequest req)
        {
            var usuarios = _config.GetSection("Usuarios").Get<Dictionary<string, string>>() ?? [];
            if (!usuarios.TryGetValue(req.Usuario, out var senhaCorreta) || senhaCorreta != req.Senha)
                return Unauthorized(new { error = "Usuário ou senha inválidos." });

            var token = GerarToken(req.Usuario);
            return Ok(token);
        }

        private LoginResponse GerarToken(string usuario)
        {
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config["Jwt:Secret"]!));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
            var horas = int.TryParse(_config["Jwt:ExpiracaoHoras"], out var h) ? h : 720;
            var expiracao = DateTime.UtcNow.AddHours(horas);

            var claims = new[]
            {
                new Claim(ClaimTypes.Name, usuario),
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            };

            var token = new JwtSecurityToken(
                issuer: _config["Jwt:Issuer"],
                audience: _config["Jwt:Audience"],
                claims: claims,
                expires: expiracao,
                signingCredentials: creds
            );

            return new LoginResponse(new JwtSecurityTokenHandler().WriteToken(token), usuario, expiracao);
        }
    }
}
