var builder = WebApplication.CreateBuilder(args);
builder.Services.AddDbContext<AppDbContext>(options => options.UseSqlite("Data Source=trebo.db"));

var app = builder.Build();

app.Run();
