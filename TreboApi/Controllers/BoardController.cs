using System.Security.Claims;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using treboapi;
using treboapi.Hubs;
using treboapi.Models;

namespace treboapi.Controllers;

public static class BoardController
{
    public static void MapBoardRoutes(this WebApplication app)
    {
        app.MapGet("/boards/me", async (AppDbContext db, HttpContext http) =>
        {
            var userId = int.Parse(http.User.FindFirstValue(ClaimTypes.NameIdentifier)!);

            var boards = await db.Boards
                .Include(b => b.Members)
                .Include(b => b.Creator)
                .Where(b => b.CreatorId == userId || b.Members.Any(m => m.Id == userId))
                .Select(b => new
                {
                    b.Id,
                    b.Title,
                    b.Description,
                    Creator = new { b.Creator.Id, b.Creator.Username },
                    MemberCount = b.Members.Count,
                    IsOwner = b.CreatorId == userId
                })
                .ToListAsync();

            return Results.Ok(boards);
        }).RequireAuthorization();

        app.MapGet("/boards/{id}", async (AppDbContext db, HttpContext http, int id) =>
        {
            var userId = int.Parse(http.User.FindFirstValue(ClaimTypes.NameIdentifier)!);

            var board = await db.Boards
                .Include(b => b.Members)
                .Include(b => b.Creator)
                .Include(b => b.UniqueLabels)
                .Include(b => b.Columns.Where(c => !c.IsArchived).OrderBy(c => c.Position))
                    .ThenInclude(c => c.Cards.Where(card => !card.IsArchived).OrderBy(card => card.Position))
                        .ThenInclude(card => card.Members)
                .Include(b => b.Columns)
                    .ThenInclude(c => c.Cards)
                        .ThenInclude(card => card.Labels)
                .FirstOrDefaultAsync(b => b.Id == id);

            if (board == null) return Results.NotFound();

            var isMember = board.CreatorId == userId || board.Members.Any(m => m.Id == userId);
            if (!isMember) return Results.Forbid();

            return Results.Ok(new
            {
                board.Id,
                board.Title,
                board.Description,
                Creator = new { board.Creator.Id, board.Creator.Username },
                Members = board.Members.Select(m => new { m.Id, m.Username }),
                UniqueLabels = board.UniqueLabels.Select(l => new { l.Id, l.Title, l.Color }),
                Columns = board.Columns
                    .Where(c => !c.IsArchived)
                    .OrderBy(c => c.Position)
                    .Select(c => new
                    {
                        c.Id,
                        c.Title,
                        c.Position,
                        Cards = c.Cards
                            .Where(card => !card.IsArchived)
                            .OrderBy(card => card.Position)
                            .Select(card => new
                            {
                                card.Id,
                                card.Title,
                                card.Description,
                                card.Position,
                                card.CreatedAt,
                                Members = card.Members.Select(m => new { m.Id, m.Username }),
                                Labels = card.Labels.Select(l => new { l.Id, l.Title, l.Color })
                            })
                    })
            });
        }).RequireAuthorization();

        app.MapPost("/boards", async (AppDbContext db, HttpContext http, CreateBoardRequest req) =>
        {
            var userId = int.Parse(http.User.FindFirstValue(ClaimTypes.NameIdentifier)!);

            var creator = await db.Users.FindAsync(userId);

            var board = new Board
            {
                Title = req.Title,
                Description = req.Description,
                CreatorId = userId
            };

            if (creator != null) board.Members.Add(creator);

            db.Boards.Add(board);
            await db.SaveChangesAsync();

            return Results.Created($"/boards/{board.Id}", new { board.Id, board.Title, board.Description });
        }).RequireAuthorization();

        app.MapPut("/boards/{id}", async (AppDbContext db, HttpContext http, IHubContext<BoardHub> hub, int id, UpdateBoardRequest req) =>
        {
            var userId = int.Parse(http.User.FindFirstValue(ClaimTypes.NameIdentifier)!);

            var board = await db.Boards.FindAsync(id);
            if (board == null) return Results.NotFound();
            if (board.CreatorId != userId) return Results.Forbid();

            board.Title = req.Title ?? board.Title;
            board.Description = req.Description ?? board.Description;

            await db.SaveChangesAsync();
            await hub.Clients.Group($"board-{id}").SendAsync("BoardRefresh");
            return Results.Ok(new { board.Id, board.Title, board.Description });
        }).RequireAuthorization();

        app.MapDelete("/boards/{id}", async (AppDbContext db, HttpContext http, IHubContext<BoardHub> hub, int id) =>
        {
            var userId = int.Parse(http.User.FindFirstValue(ClaimTypes.NameIdentifier)!);

            var board = await db.Boards.FirstOrDefaultAsync(b => b.Id == id);
            if (board == null) return Results.NotFound();
            if (board.CreatorId != userId) return Results.Forbid();

            await db.Database.ExecuteSqlAsync($"DELETE FROM BoardUser WHERE BoardId = {id}");
            await db.Database.ExecuteSqlAsync($"DELETE FROM Labels WHERE BoardId = {id}");
            db.Boards.Remove(board);
            await db.SaveChangesAsync();
            await hub.Clients.Group($"board-{id}").SendAsync("BoardDeleted");
            return Results.Ok();
        }).RequireAuthorization();

        app.MapPost("/boards/{id}/members/{userId}", async (AppDbContext db, HttpContext http, IHubContext<BoardHub> hub, int id, int userId) =>
        {
            var requesterId = int.Parse(http.User.FindFirstValue(ClaimTypes.NameIdentifier)!);

            var board = await db.Boards
                .Include(b => b.Members)
                .FirstOrDefaultAsync(b => b.Id == id);

            if (board == null) return Results.NotFound();
            if (board.CreatorId != requesterId) return Results.Forbid();

            var user = await db.Users.FindAsync(userId);
            if (user == null) return Results.NotFound();

            if (board.Members.Any(m => m.Id == userId))
                return Results.Conflict("User is already a member of this board.");

            board.Members.Add(user);
            await db.SaveChangesAsync();
            await hub.Clients.Group($"board-{id}").SendAsync("BoardRefresh");
            await hub.Clients.Group($"user-{userId}").SendAsync("BoardsUpdated");
            return Results.Ok();
        }).RequireAuthorization();

        app.MapGet("/boards/{id}/archived", async (AppDbContext db, HttpContext http, int id) =>
        {
            var userId = int.Parse(http.User.FindFirstValue(ClaimTypes.NameIdentifier)!);

            var board = await db.Boards
                .Include(b => b.Members)
                .FirstOrDefaultAsync(b => b.Id == id);

            if (board == null) return Results.NotFound();

            var isMember = board.CreatorId == userId || board.Members.Any(m => m.Id == userId);
            if (!isMember) return Results.Forbid();

            var archivedColumns = await db.Columns
                .Where(c => c.BoardId == id && c.IsArchived)
                .Select(c => new { c.Id, c.Title })
                .ToListAsync();

            var archivedCards = await db.Cards
                .Include(card => card.Column)
                .Where(card => card.Column.BoardId == id && card.IsArchived && !card.Column.IsArchived)
                .Select(card => new { card.Id, card.Title, card.ColumnId, ColumnTitle = card.Column.Title })
                .ToListAsync();

            return Results.Ok(new { Columns = archivedColumns, Cards = archivedCards });
        }).RequireAuthorization();

        app.MapDelete("/boards/{id}/members/{userId}", async (AppDbContext db, HttpContext http, IHubContext<BoardHub> hub, int id, int userId) =>
        {
            var requesterId = int.Parse(http.User.FindFirstValue(ClaimTypes.NameIdentifier)!);

            var board = await db.Boards
                .Include(b => b.Members)
                .FirstOrDefaultAsync(b => b.Id == id);

            if (board == null) return Results.NotFound();

            var isCreator = board.CreatorId == requesterId;
            var isSelf = requesterId == userId;
            if (!isCreator && !isSelf) return Results.Forbid();

            var user = board.Members.FirstOrDefault(m => m.Id == userId);
            if (user == null) return Results.NotFound();

            board.Members.Remove(user);
            await db.SaveChangesAsync();
            await hub.Clients.Group($"board-{id}").SendAsync("BoardRefresh");
            await hub.Clients.Group($"user-{userId}").SendAsync("BoardsUpdated");
            return Results.Ok();
        }).RequireAuthorization();
    }
}

public record CreateBoardRequest(string Title, string Description);
public record UpdateBoardRequest(string? Title, string? Description);