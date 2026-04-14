using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using treboapi;
using treboapi.Models;

namespace treboapi.Controllers;
public static class UserController
{
    public static void MapAuthRoutes(this WebApplication app)
    {
        app.MapPost("/auth/register", async (AppDbContext db, IConfiguration config, RegisterRequest req) =>
        {
            var exists = await db.Users.AnyAsync(u => u.Email == req.Email || u.Username == req.Username);
            if (exists) return Results.Conflict("Email or username already in use.");

            var user = new User
            {
                Username = req.Username,
                Email = req.Email,
                Password = BCrypt.Net.BCrypt.HashPassword(req.Password) 
            };

            db.Users.Add(user);
            await db.SaveChangesAsync();

            return Results.Created($"/users/{user.Id}", new { user.Id, user.Username, user.Email });
        });


        app.MapPost("/auth/login", async (AppDbContext db, IConfiguration config, LoginRequest req) =>
        {
            var user = await db.Users.FirstOrDefaultAsync(u => u.Email == req.Email);
            
            if (user == null || !BCrypt.Net.BCrypt.Verify(req.Password, user.Password))
                return Results.Unauthorized();

            var accessToken = GenerateAccessToken(user, config);
            var refreshToken = GenerateRefreshToken();
            
            user.RefreshToken = refreshToken;
            user.RefreshTokenExpiry = DateTime.UtcNow.AddDays(
                config.GetValue<int>("Jwt:RefreshTokenExpiry")
            );
            await db.SaveChangesAsync();

            return Results.Ok(new
            {
                AccessToken = accessToken,
                RefreshToken = refreshToken,
                user.Id,
                user.Username,
                user.Email
            });
        });


        app.MapPost("/auth/refresh", async (AppDbContext db, IConfiguration config, RefreshRequest req) =>
        {
            var user = await db.Users.FirstOrDefaultAsync(u => u.RefreshToken == req.RefreshToken);
            
            if (user == null || user.RefreshTokenExpiry < DateTime.UtcNow)
                return Results.Unauthorized();

            var newAccessToken = GenerateAccessToken(user, config);
            var newRefreshToken = GenerateRefreshToken();

            user.RefreshToken = newRefreshToken;
            user.RefreshTokenExpiry = DateTime.UtcNow.AddDays(
                config.GetValue<int>("Jwt:RefreshTokenExpiry")
            );
            await db.SaveChangesAsync();

            return Results.Ok(new
            {
                AccessToken = newAccessToken,
                RefreshToken = newRefreshToken
            });
        });


        app.MapPost("/auth/logout", async (AppDbContext db, HttpContext http) =>
        {
            var userId = int.Parse(http.User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var user = await db.Users.FindAsync(userId);

            if (user == null) return Results.NotFound();
            
            user.RefreshToken = null;
            user.RefreshTokenExpiry = null;
            await db.SaveChangesAsync();

            return Results.Ok();
        }).RequireAuthorization(); 
    }
    private static string GenerateAccessToken(User user, IConfiguration config)
    {
        var key = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(config["Jwt:SecretKey"]!)
        );

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Name, user.Username),
            new Claim(ClaimTypes.Email, user.Email)
        };

        var token = new JwtSecurityToken(
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(config.GetValue<int>("Jwt:AccessTokenExpiry")),
            signingCredentials: new SigningCredentials(key, SecurityAlgorithms.HmacSha256)
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
    private static string GenerateRefreshToken()
    {
        return Convert.ToBase64String(RandomNumberGenerator.GetBytes(64));
    }
}

public record RegisterRequest(string Username, string Email, string Password);
public record LoginRequest(string Email, string Password);
public record RefreshRequest(string RefreshToken);