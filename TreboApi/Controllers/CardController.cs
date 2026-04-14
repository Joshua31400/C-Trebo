using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using treboapi;
using treboapi.Models;

namespace treboapi.Controllers;

public static class CardController
{
    public static void MapCardRoutes(this WebApplication app)
    {
        app.MapPost("/boards/{boardId}/columns/{columnId}/cards", async (AppDbContext db, HttpContext http, int boardId, int columnId, CreateCardRequest req) =>
        {
            var userId = int.Parse(http.User.FindFirstValue(ClaimTypes.NameIdentifier)!);

            var board = await db.Boards
                .Include(b => b.Members)
                .FirstOrDefaultAsync(b => b.Id == boardId);

            if (board == null) return Results.NotFound();

            var isMember = board.CreatorId == userId || board.Members.Any(m => m.Id == userId);
            if (!isMember) return Results.Forbid();

            var column = await db.Columns.FirstOrDefaultAsync(c => c.Id == columnId && c.BoardId == boardId);
            if (column == null) return Results.NotFound();

            var lastPosition = await db.Cards
                .Where(c => c.ColumnId == columnId)
                .MaxAsync(c => c.Position) ?? -1;

            var card = new Card
            {
                Title = req.Title,
                Description = req.Description ?? string.Empty,
                ColumnId = columnId,
                Position = lastPosition + 1
            };

            db.Cards.Add(card);
            await db.SaveChangesAsync();
            return Results.Created($"/boards/{boardId}/columns/{columnId}/cards/{card.Id}", card);
        }).RequireAuthorization();


        app.MapGet("/boards/{boardId}/columns/{columnId}/cards/{cardId}", async (AppDbContext db, HttpContext http, int boardId, int columnId, int cardId) =>
        {
            var userId = int.Parse(http.User.FindFirstValue(ClaimTypes.NameIdentifier)!);

            var board = await db.Boards
                .Include(b => b.Members)
                .FirstOrDefaultAsync(b => b.Id == boardId);

            if (board == null) return Results.NotFound();

            var isMember = board.CreatorId == userId || board.Members.Any(m => m.Id == userId);
            if (!isMember) return Results.Forbid();

            var card = await db.Cards
                .Include(c => c.Members)
                .Include(c => c.Labels)
                .Include(c => c.Comments)
                    .ThenInclude(comment => comment.Creator)
                .FirstOrDefaultAsync(c => c.Id == cardId && c.ColumnId == columnId);

            if (card == null) return Results.NotFound();

            return Results.Ok(card);
        }).RequireAuthorization();


        app.MapPut("/boards/{boardId}/columns/{columnId}/cards/{cardId}", async (AppDbContext db, HttpContext http, int boardId, int columnId, int cardId, UpdateCardRequest req) =>
        {
            var userId = int.Parse(http.User.FindFirstValue(ClaimTypes.NameIdentifier)!);

            var board = await db.Boards
                .Include(b => b.Members)
                .FirstOrDefaultAsync(b => b.Id == boardId);

            if (board == null) return Results.NotFound();

            var isMember = board.CreatorId == userId || board.Members.Any(m => m.Id == userId);
            if (!isMember) return Results.Forbid();

            var card = await db.Cards.FirstOrDefaultAsync(c => c.Id == cardId && c.ColumnId == columnId);
            if (card == null) return Results.NotFound();

            card.Title = req.Title ?? card.Title;
            card.Description = req.Description ?? card.Description;

            await db.SaveChangesAsync();
            return Results.Ok(card);
        }).RequireAuthorization();


        app.MapPatch("/boards/{boardId}/columns/{columnId}/cards/{cardId}/archive", async (AppDbContext db, HttpContext http, int boardId, int columnId, int cardId) =>
        {
            var userId = int.Parse(http.User.FindFirstValue(ClaimTypes.NameIdentifier)!);

            var board = await db.Boards
                .Include(b => b.Members)
                .FirstOrDefaultAsync(b => b.Id == boardId);

            if (board == null) return Results.NotFound();

            var isMember = board.CreatorId == userId || board.Members.Any(m => m.Id == userId);
            if (!isMember) return Results.Forbid();

            var card = await db.Cards.FirstOrDefaultAsync(c => c.Id == cardId && c.ColumnId == columnId);
            if (card == null) return Results.NotFound();

            card.IsArchived = !card.IsArchived;

            await db.SaveChangesAsync();
            return Results.Ok(card);
        }).RequireAuthorization();


        app.MapPatch("/boards/{boardId}/columns/{columnId}/cards/{cardId}/move", async (AppDbContext db, HttpContext http, int boardId, int columnId, int cardId, MoveCardRequest req) =>
        {
            var userId = int.Parse(http.User.FindFirstValue(ClaimTypes.NameIdentifier)!);

            var board = await db.Boards
                .Include(b => b.Members)
                .FirstOrDefaultAsync(b => b.Id == boardId);

            if (board == null) return Results.NotFound();

            var isMember = board.CreatorId == userId || board.Members.Any(m => m.Id == userId);
            if (!isMember) return Results.Forbid();

            var targetColumn = await db.Columns.FirstOrDefaultAsync(c => c.Id == req.TargetColumnId && c.BoardId == boardId);
            if (targetColumn == null) return Results.NotFound();

            var card = await db.Cards.FirstOrDefaultAsync(c => c.Id == cardId && c.ColumnId == columnId);
            if (card == null) return Results.NotFound();

            var lastPosition = await db.Cards
                .Where(c => c.ColumnId == req.TargetColumnId)
                .MaxAsync(c => c.Position) ?? -1;

            card.ColumnId = req.TargetColumnId;
            card.Position = lastPosition + 1;

            await db.SaveChangesAsync();
            return Results.Ok(card);
        }).RequireAuthorization();


        app.MapPatch("/boards/{boardId}/columns/{columnId}/cards/reorder", async (AppDbContext db, HttpContext http, int boardId, int columnId, ReorderRequest req) =>
        {
            var userId = int.Parse(http.User.FindFirstValue(ClaimTypes.NameIdentifier)!);

            var board = await db.Boards
                .Include(b => b.Members)
                .FirstOrDefaultAsync(b => b.Id == boardId);

            if (board == null) return Results.NotFound();

            var isMember = board.CreatorId == userId || board.Members.Any(m => m.Id == userId);
            if (!isMember) return Results.Forbid();

            for (int i = 0; i < req.Ids.Count; i++)
            {
                var card = await db.Cards.FirstOrDefaultAsync(c => c.Id == req.Ids[i] && c.ColumnId == columnId);
                if (card != null) card.Position = i;
            }

            await db.SaveChangesAsync();
            return Results.Ok();
        }).RequireAuthorization();


        app.MapPost("/boards/{boardId}/columns/{columnId}/cards/{cardId}/members/{memberId}", async (AppDbContext db, HttpContext http, int boardId, int columnId, int cardId, int memberId) =>
        {
            var userId = int.Parse(http.User.FindFirstValue(ClaimTypes.NameIdentifier)!);

            var board = await db.Boards
                .Include(b => b.Members)
                .FirstOrDefaultAsync(b => b.Id == boardId);

            if (board == null) return Results.NotFound();

            var isMember = board.CreatorId == userId || board.Members.Any(m => m.Id == userId);
            if (!isMember) return Results.Forbid();

            var card = await db.Cards
                .Include(c => c.Members)
                .FirstOrDefaultAsync(c => c.Id == cardId && c.ColumnId == columnId);

            if (card == null) return Results.NotFound();

            var userToAdd = await db.Users.FindAsync(memberId);
            if (userToAdd == null) return Results.NotFound();

            if (card.Members.Any(m => m.Id == memberId))
                return Results.Conflict("User is already a member of this card.");

            card.Members.Add(userToAdd);
            await db.SaveChangesAsync();
            return Results.Ok();
        }).RequireAuthorization();


        app.MapDelete("/boards/{boardId}/columns/{columnId}/cards/{cardId}/members/{memberId}", async (AppDbContext db, HttpContext http, int boardId, int columnId, int cardId, int memberId) =>
        {
            var userId = int.Parse(http.User.FindFirstValue(ClaimTypes.NameIdentifier)!);

            var board = await db.Boards
                .Include(b => b.Members)
                .FirstOrDefaultAsync(b => b.Id == boardId);

            if (board == null) return Results.NotFound();

            var isMember = board.CreatorId == userId || board.Members.Any(m => m.Id == userId);
            if (!isMember) return Results.Forbid();

            var card = await db.Cards
                .Include(c => c.Members)
                .FirstOrDefaultAsync(c => c.Id == cardId && c.ColumnId == columnId);

            if (card == null) return Results.NotFound();

            var userToRemove = card.Members.FirstOrDefault(m => m.Id == memberId);
            if (userToRemove == null) return Results.NotFound();

            card.Members.Remove(userToRemove);
            await db.SaveChangesAsync();
            return Results.Ok();
        }).RequireAuthorization();


        app.MapDelete("/boards/{boardId}/columns/{columnId}/cards/{cardId}", async (AppDbContext db, HttpContext http, int boardId, int columnId, int cardId) =>
        {
            var userId = int.Parse(http.User.FindFirstValue(ClaimTypes.NameIdentifier)!);

            var board = await db.Boards
                .Include(b => b.Members)
                .FirstOrDefaultAsync(b => b.Id == boardId);

            if (board == null) return Results.NotFound();

            var isMember = board.CreatorId == userId || board.Members.Any(m => m.Id == userId);
            if (!isMember) return Results.Forbid();

            var card = await db.Cards.FirstOrDefaultAsync(c => c.Id == cardId && c.ColumnId == columnId);
            if (card == null) return Results.NotFound();

            db.Cards.Remove(card);
            await db.SaveChangesAsync();
            return Results.Ok();
        }).RequireAuthorization();
    }
}

public record CreateCardRequest(string Title, string? Description);
public record UpdateCardRequest(string? Title, string? Description);
public record MoveCardRequest(int TargetColumnId);