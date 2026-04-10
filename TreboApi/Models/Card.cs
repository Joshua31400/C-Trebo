namespace DefaultNamespace;

public class Card
{
    public int Id { get; set; }
    public string Title { get; set; }
    public string Description { get; set; }
    public DateTime CreatedAt { get; set; }
    public list<member> Members { get; set; }
    public list<Comment> Comments { get; set; }
    public int ColumnId { get; set; }
    public Column Column { get; set; }
}