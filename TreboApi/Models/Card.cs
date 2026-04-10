namespace DefaultNamespace;

public class Card
{
    public int Id { get; set; }
    public string Title { get; set; }
    public string Description { get; set; }
    public DateTime CreatedAt { get; set; }
    public List<User> Members { get; set; }
    public List<Comment> Comments { get; set; }
    public int ColumnId { get; set; }
    public Column Column { get; set; }
}