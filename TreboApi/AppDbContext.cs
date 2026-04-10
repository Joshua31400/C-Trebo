using Microsoft.EntityFrameworkCore;

namespace treboapi;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }
}