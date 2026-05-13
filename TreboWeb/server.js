import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(express.static(path.join(__dirname, 'public')));

app.get('/login', (_, res) => res.sendFile(path.join(__dirname, 'views', 'login.html')));
app.get('/register', (_, res) => res.sendFile(path.join(__dirname, 'views', 'register.html')));
app.get('/boards', (_, res) => res.sendFile(path.join(__dirname, 'views', 'boards.html')));
app.get('/board', (_, res) => res.sendFile(path.join(__dirname, 'views', 'board.html')));
app.get('/', (_, res) => res.redirect('/boards'));

app.listen(8080, () => console.log('TreboWeb running on http://localhost:8080'));
