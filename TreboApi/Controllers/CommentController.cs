using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using treboapi;
using treboapi.Models;

namespace treboapi.Controllers;

public static class CommentController
{
    public static void MapCommentRoutes(this WebApplication app)
    {
        app.MapGet("/boards/{boardId}/columns/{columnId}/cards/{cardId}/comments", async (AppDbContext db, HttpContext http, int boardId, int columnId, int cardId) =>
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

            var comments = await db.Comments
                .Include(c => c.Creator)
                .Where(c => c.CardId == cardId)
                .OrderBy(c => c.CreatedAt)
                .Select(c => new
                {
                    c.Id,
                    c.Content,
                    c.CreatedAt,
                    Creator = new { c.Creator.Id, c.Creator.Username }
                })
                .ToListAsync();

            return Results.Ok(comments);
        }).RequireAuthorization();
        
        app.MapPost("/boards/{boardId}/columns/{columnId}/cards/{cardId}/comments", async (AppDbContext db, HttpContext http, int boardId, int columnId, int cardId, CreateCommentRequest req) =>
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

            var comment = new Comment
            {
                Content = req.Content,
                CreatorId = userId,
                CardId = cardId
            };

            db.Comments.Add(comment);
            await db.SaveChangesAsync();
            return Results.Created($"/boards/{boardId}/columns/{columnId}/cards/{cardId}/comments/{comment.Id}", new
            {
                comment.Id,
                comment.Content,
                comment.CreatedAt,
                comment.CardId,
                Creator = new { comment.CreatorId }
            });
        }).RequireAuthorization();


        app.MapPut("/boards/{boardId}/columns/{columnId}/cards/{cardId}/comments/{commentId}", async (AppDbContext db, HttpContext http, int boardId, int columnId, int cardId, int commentId, UpdateCommentRequest req) =>
        {
            var userId = int.Parse(http.User.FindFirstValue(ClaimTypes.NameIdentifier)!);

            var board = await db.Boards
                .Include(b => b.Members)
                .FirstOrDefaultAsync(b => b.Id == boardId);

            if (board == null) return Results.NotFound();

            var isMember = board.CreatorId == userId || board.Members.Any(m => m.Id == userId);
            if (!isMember) return Results.Forbid();

            var comment = await db.Comments.FirstOrDefaultAsync(c => c.Id == commentId && c.CardId == cardId);
            if (comment == null) return Results.NotFound();

            if (comment.CreatorId != userId) return Results.Forbid();

            comment.Content = req.Content ?? comment.Content;

            await db.SaveChangesAsync();
            return Results.Ok(new
            {
                comment.Id,
                comment.Content,
                comment.CreatedAt,
                comment.CardId,
                Creator = new { comment.CreatorId }
            });
        }).RequireAuthorization();


        app.MapDelete("/boards/{boardId}/columns/{columnId}/cards/{cardId}/comments/{commentId}", async (AppDbContext db, HttpContext http, int boardId, int columnId, int cardId, int commentId) =>
        {
            var userId = int.Parse(http.User.FindFirstValue(ClaimTypes.NameIdentifier)!);

            var board = await db.Boards
                .Include(b => b.Members)
                .FirstOrDefaultAsync(b => b.Id == boardId);

            if (board == null) return Results.NotFound();

            var comment = await db.Comments.FirstOrDefaultAsync(c => c.Id == commentId && c.CardId == cardId);
            if (comment == null) return Results.NotFound();

            var isCommentOwner = comment.CreatorId == userId;
            var isBoardOwner = board.CreatorId == userId;
            if (!isCommentOwner && !isBoardOwner) return Results.Forbid();

            db.Comments.Remove(comment);
            await db.SaveChangesAsync();
            return Results.Ok();
        }).RequireAuthorization();
    }
}

public record CreateCommentRequest(string Content);
public record UpdateCommentRequest(string? Content);