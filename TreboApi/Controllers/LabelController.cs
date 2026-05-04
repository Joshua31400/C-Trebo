using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using treboapi;
using treboapi.Models;

namespace treboapi.Controllers;

public static class LabelController
{
    public static void MapLabelRoutes(this WebApplication app)
    {
        app.MapGet("/boards/{boardId}/labels", async (AppDbContext db, HttpContext http, int boardId) =>
        {
            var userId = int.Parse(http.User.FindFirstValue(ClaimTypes.NameIdentifier)!);

            var board = await db.Boards
                .Include(b => b.Members)
                .FirstOrDefaultAsync(b => b.Id == boardId);

            if (board == null) return Results.NotFound();

            var isMember = board.CreatorId == userId || board.Members.Any(m => m.Id == userId);
            if (!isMember) return Results.Forbid();

            var labels = await db.Labels
                .Where(l => l.IsDefault || l.BoardId == boardId)
                .Select(l => new { l.Id, l.Title, l.Color, l.IsDefault })
                .ToListAsync();

            return Results.Ok(labels);
        }).RequireAuthorization();


        app.MapPost("/boards/{boardId}/labels", async (AppDbContext db, HttpContext http, int boardId, CreateLabelRequest req) =>
        {
            var userId = int.Parse(http.User.FindFirstValue(ClaimTypes.NameIdentifier)!);

            var board = await db.Boards
                .Include(b => b.Members)
                .FirstOrDefaultAsync(b => b.Id == boardId);

            if (board == null) return Results.NotFound();

            var isMember = board.CreatorId == userId || board.Members.Any(m => m.Id == userId);
            if (!isMember) return Results.Forbid();

            var label = new Label
            {
                Title = req.Title,
                Color = req.Color,
                IsDefault = false,
                BoardId = boardId
            };

            db.Labels.Add(label);
            await db.SaveChangesAsync();
            return Results.Created($"/boards/{boardId}/labels/{label.Id}", new { label.Id, label.Title, label.Color, label.IsDefault });
        }).RequireAuthorization();


        app.MapPost("/boards/{boardId}/columns/{columnId}/cards/{cardId}/labels/{labelId}", async (AppDbContext db, HttpContext http, int boardId, int columnId, int cardId, int labelId) =>
        {
            var userId = int.Parse(http.User.FindFirstValue(ClaimTypes.NameIdentifier)!);

            var board = await db.Boards
                .Include(b => b.Members)
                .FirstOrDefaultAsync(b => b.Id == boardId);

            if (board == null) return Results.NotFound();

            var isMember = board.CreatorId == userId || board.Members.Any(m => m.Id == userId);
            if (!isMember) return Results.Forbid();

            var card = await db.Cards
                .Include(c => c.Labels)
                .FirstOrDefaultAsync(c => c.Id == cardId && c.ColumnId == columnId);

            if (card == null) return Results.NotFound();

            var label = await db.Labels.FirstOrDefaultAsync(l => l.Id == labelId && (l.IsDefault || l.BoardId == boardId));
            if (label == null) return Results.NotFound();

            if (card.Labels.Any(l => l.Id == labelId))
                return Results.Conflict("Label is already attached to this card.");

            card.Labels.Add(label);
            await db.SaveChangesAsync();
            return Results.Ok();
        }).RequireAuthorization();


        app.MapDelete("/boards/{boardId}/columns/{columnId}/cards/{cardId}/labels/{labelId}", async (AppDbContext db, HttpContext http, int boardId, int columnId, int cardId, int labelId) =>
        {
            var userId = int.Parse(http.User.FindFirstValue(ClaimTypes.NameIdentifier)!);

            var board = await db.Boards
                .Include(b => b.Members)
                .FirstOrDefaultAsync(b => b.Id == boardId);

            if (board == null) return Results.NotFound();

            var isMember = board.CreatorId == userId || board.Members.Any(m => m.Id == userId);
            if (!isMember) return Results.Forbid();

            var card = await db.Cards
                .Include(c => c.Labels)
                .FirstOrDefaultAsync(c => c.Id == cardId && c.ColumnId == columnId);

            if (card == null) return Results.NotFound();

            var label = card.Labels.FirstOrDefault(l => l.Id == labelId);
            if (label == null) return Results.NotFound();

            card.Labels.Remove(label);
            await db.SaveChangesAsync();
            return Results.Ok();
        }).RequireAuthorization();


        app.MapDelete("/boards/{boardId}/labels/{labelId}", async (AppDbContext db, HttpContext http, int boardId, int labelId) =>
        {
            var userId = int.Parse(http.User.FindFirstValue(ClaimTypes.NameIdentifier)!);

            var board = await db.Boards
                .Include(b => b.Members)
                .FirstOrDefaultAsync(b => b.Id == boardId);

            if (board == null) return Results.NotFound();

            var isMember = board.CreatorId == userId || board.Members.Any(m => m.Id == userId);
            if (!isMember) return Results.Forbid();

            var label = await db.Labels.FirstOrDefaultAsync(l => l.Id == labelId && l.BoardId == boardId && !l.IsDefault);
            if (label == null) return Results.NotFound();

            db.Labels.Remove(label);
            await db.SaveChangesAsync();
            return Results.Ok();
        }).RequireAuthorization();
    }
}

public record CreateLabelRequest(string Title, string Color);