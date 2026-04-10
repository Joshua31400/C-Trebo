namespace DefaultNamespace;

public class Column
{
        public int Id { get; set; }
        public string Title { get; set; }
        public List<Card> Cards { get; set; }
        public List<Card> ArchivedCards { get; set; }
        public int BoardId { get; set; }
        public Board Board { get; set; }
}