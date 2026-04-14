namespace treboapi.Models;

public class Board
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public List<Column> Columns { get; set; } = [];
    public List<User> Members { get; set; } = [];
    public List<Label> UniqueLabels { get; set; } = [];
    public int CreatorId { get; set; }
    public User Creator { get; set; } = null!;
}