namespace treboapi.Models;

public class Label
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Color { get; set; } = string.Empty;
    public bool IsDefault { get; set; } = false;
    public int? BoardId { get; set; }
    public Board? Board { get; set; }
    public List<Card> Cards { get; set; } = [];
}