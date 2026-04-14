namespace treboapi.Models;

public class Comment
{
    public int Id { get; set; }
    public string Content { get; set; } = string.Empty;
    public int CreatorId { get; set; }
    public User Creator { get; set; } = null!;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public int CardId { get; set; }
    public Card Card { get; set; } = null!;
}