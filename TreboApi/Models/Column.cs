namespace treboapi.Models;

public class Column
{
        public int Id { get; set; }
        public string Title { get; set; }
        public List<Card> Cards { get; set; }
        public bool IsArchived { get; set; } = false;
        public int BoardId { get; set; }
        public Board Board { get; set; }
}