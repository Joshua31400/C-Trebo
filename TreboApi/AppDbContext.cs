using Microsoft.EntityFrameworkCore;
using treboapi.Models;

namespace treboapi;

public class AppDbContext : DbContext
{
    public DbSet<Board> Boards { get; set; } = null!;
    public DbSet<Column> Columns { get; set; } = null!;
    public DbSet<Card> Cards { get; set; } = null!;
    public DbSet<Label> Labels { get; set; } = null!;
    public DbSet<User> Users { get; set; } = null!;
    public DbSet<Comment> Comments { get; set; } = null!;

    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Board>()
            .HasMany(b => b.Members)
            .WithMany()
            .UsingEntity<Dictionary<string, object>>("BoardUser",
                r => r.HasOne<User>().WithMany().HasForeignKey("UserId").OnDelete(DeleteBehavior.Cascade),
                l => l.HasOne<Board>().WithMany().HasForeignKey("BoardId").OnDelete(DeleteBehavior.Cascade),
                j => j.HasKey("BoardId", "UserId")
            );

        modelBuilder.Entity<Card>()
            .HasMany(c => c.Members)
            .WithMany()
            .UsingEntity<Dictionary<string, object>>("CardUser",
                r => r.HasOne<User>().WithMany().HasForeignKey("UserId").OnDelete(DeleteBehavior.Cascade),
                l => l.HasOne<Card>().WithMany().HasForeignKey("CardId").OnDelete(DeleteBehavior.Cascade),
                j => j.HasKey("CardId", "UserId")
            );
    }
}