namespace treboapi.Models;

public class Column
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public int? Position { get; set; }
    public bool IsArchived { get; set; } = false;
    public int BoardId { get; set; }
    public Board Board { get; set; } = null!;
    public List<Card> Cards { get; set; } = [];
}