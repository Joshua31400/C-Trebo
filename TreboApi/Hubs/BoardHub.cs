using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace treboapi.Hubs;

public class BoardHub : Hub
{
    public async Task JoinBoard(int boardId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, $"board-{boardId}");
    }

    public async Task LeaveBoard(int boardId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"board-{boardId}");
    }

    [Authorize]
    public async Task JoinUserChannel()
    {
        var userId = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId != null)
            await Groups.AddToGroupAsync(Context.ConnectionId, $"user-{userId}");
    }
}
