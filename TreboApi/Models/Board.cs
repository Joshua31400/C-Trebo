namespace DefaultNamespace;

public class Board
{
    public int Id { get; set; }
    public string Title { get; set; }
    public string Description { get; set; }
    public List<Column> Columns { get; set; }
    public List<Column> ArchivedColumns { get; set; } 
    public List<User> Members { get; set; }
}