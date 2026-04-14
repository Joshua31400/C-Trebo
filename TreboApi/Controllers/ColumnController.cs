using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using treboapi;
using treboapi.Models;

namespace treboapi.Controllers;

public static class ColumnController
{
    public static void MapColumnRoutes(this WebApplication app)
    {
        app.MapPost("/boards/{boardId}/columns", async (AppDbContext db, HttpContext http, int boardId, CreateColumnRequest req) =>
        {
            var userId = int.Parse(http.User.FindFirstValue(ClaimTypes.NameIdentifier)!);

            var board = await db.Boards
                .Include(b => b.Members)
                .FirstOrDefaultAsync(b => b.Id == boardId);

            if (board == null) return Results.NotFound();

            var isMember = board.CreatorId == userId || board.Members.Any(m => m.Id == userId);
            if (!isMember) return Results.Forbid();

            var lastPosition = await db.Columns
                .Where(c => c.BoardId == boardId)
                .MaxAsync(c => c.Position) ?? -1;

            var column = new Column
            {
                Title = req.Title,
                BoardId = boardId,
                Position = lastPosition + 1
            };

            db.Columns.Add(column);
            await db.SaveChangesAsync();
            return Results.Created($"/boards/{boardId}/columns/{column.Id}", column);
        }).RequireAuthorization();
        
        app.MapPut("/boards/{boardId}/columns/{columnId}", async (AppDbContext db, HttpContext http, int boardId, int columnId, UpdateColumnRequest req) =>
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

            column.Title = req.Title ?? column.Title;

            await db.SaveChangesAsync();
            return Results.Ok(column);
        }).RequireAuthorization();
        
        app.MapPatch("/boards/{boardId}/columns/{columnId}/archive", async (AppDbContext db, HttpContext http, int boardId, int columnId) =>
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

            column.IsArchived = !column.IsArchived;

            await db.SaveChangesAsync();
            return Results.Ok(column);
        }).RequireAuthorization();
        
        app.MapPatch("/boards/{boardId}/columns/reorder", async (AppDbContext db, HttpContext http, int boardId, ReorderRequest req) =>
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
                var column = await db.Columns.FirstOrDefaultAsync(c => c.Id == req.Ids[i] && c.BoardId == boardId);
                if (column != null) column.Position = i;
            }

            await db.SaveChangesAsync();
            return Results.Ok();
        }).RequireAuthorization();

        app.MapDelete("/boards/{boardId}/columns/{columnId}", async (AppDbContext db, HttpContext http, int boardId, int columnId) =>
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

            db.Columns.Remove(column);
            await db.SaveChangesAsync();
            return Results.Ok();
        }).RequireAuthorization();
    }
}

public record CreateColumnRequest(string Title);
public record UpdateColumnRequest(string? Title);
public record ReorderRequest(List<int> Ids);