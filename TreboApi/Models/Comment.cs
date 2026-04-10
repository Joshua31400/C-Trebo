namespace DefaultNamespace;

public class Comment
{
    public int Id { get; set; }
    public string Content { get; set; }
    public int CreatorId  { get; set; }
    public User Creator { get; set; }
    public DateTime CreatedAt { get; set; }
    public int CardId { get; set; }
    public Card Card { get; set; }
}