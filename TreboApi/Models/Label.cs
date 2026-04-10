namespace DefaultNamespace;

public class Label
{
    public int Id { get; set; }
    public string Title { get; set; }
    public string Color { get; set; }
    public bool IsDefault { get; set; }
    public int? BoardId { get; set; }
    public Board Board { get; set; }
    public List<Card> Cards { get; set; }
}