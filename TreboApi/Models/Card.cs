namespace treboapi.Models;

public class Card
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public bool IsArchived { get; set; } = false;
    public int? Position { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public List<User> Members { get; set; } = [];
    public List<Comment> Comments { get; set; } = [];
    public List<Label> Labels { get; set; } = [];
    public int ColumnId { get; set; }
    public Column Column { get; set; } = null!;
}