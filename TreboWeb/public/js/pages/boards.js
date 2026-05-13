import { api, clearSession, getUser, API_BASE } from '../api/client.js';

const user = getUser();
if (!user) window.location.href = '/login';

document.getElementById('username-display').textContent = user.username;

document.getElementById('logout-btn').addEventListener('click', async () => {
    try { await api.post('/auth/logout'); } catch { /* ignore */ }
    clearSession();
    window.location.href = '/login';
});

const boardsGrid = document.getElementById('boards-grid');
const emptyState = document.getElementById('empty-state');
const loadingEl = document.getElementById('boards-loading');
const createModal = document.getElementById('create-modal');
const createForm = document.getElementById('create-form');

const CARD_GRADIENTS = [
    ['#4f46e5', '#7c3aed'],
    ['#0891b2', '#0e7490'],
    ['#059669', '#047857'],
    ['#dc2626', '#b91c1c'],
    ['#d97706', '#b45309'],
    ['#7c3aed', '#6d28d9'],
    ['#db2777', '#be185d'],
    ['#0284c7', '#0369a1'],
];

function escapeHtml(str) {
    const d = document.createElement('div');
    d.appendChild(document.createTextNode(str || ''));
    return d.innerHTML;
}

async function loadBoards() {
    loadingEl.classList.remove('hidden');
    boardsGrid.classList.add('hidden');
    emptyState.classList.add('hidden');

    try {
        const boards = await api.get('/boards/me');

        loadingEl.classList.add('hidden');

        if (boards.length === 0) {
            emptyState.classList.remove('hidden');
            return;
        }

        boardsGrid.innerHTML = '';
        boards.forEach(board => boardsGrid.appendChild(createBoardCard(board)));
        boardsGrid.classList.remove('hidden');
    } catch {
        loadingEl.textContent = 'Failed to load boards.';
    }
}

function createBoardCard(board) {
    const [from, to] = CARD_GRADIENTS[board.id % CARD_GRADIENTS.length];
    const card = document.createElement('div');
    card.className = 'board-card relative rounded-xl p-5 cursor-pointer group overflow-hidden';
    card.style.background = `linear-gradient(135deg, ${from}, ${to})`;

    card.innerHTML = `
        <div class="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity" style="background: rgba(255,255,255,0.05);"></div>
        <h3 class="text-white font-bold text-base mb-1 truncate pr-8">${escapeHtml(board.title)}</h3>
        <p class="text-white/65 text-sm truncate leading-relaxed mb-4">${escapeHtml(board.description || ' ')}</p>
        <div class="flex items-center justify-between">
            <div class="flex items-center gap-1.5">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span class="text-white/60 text-xs">${board.memberCount} member${board.memberCount !== 1 ? 's' : ''}</span>
            </div>
            ${board.isOwner ? '<span class="text-white/50 text-xs bg-black/20 rounded-full px-2 py-0.5">Owner</span>' : ''}
        </div>
        ${board.isOwner ? `
        <button class="delete-board absolute top-3 right-3 p-1.5 text-white/30 hover:text-red-300 opacity-0 group-hover:opacity-100 transition-all rounded-lg hover:bg-black/20"
            data-id="${board.id}" title="Delete board">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
        </button>
        ` : ''}
    `;

    card.addEventListener('click', (e) => {
        if (e.target.closest('.delete-board')) return;
        window.location.href = `/board?id=${board.id}`;
    });

    const deleteBtn = card.querySelector('.delete-board');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            if (!confirm(`Delete "${board.title}"? This cannot be undone.`)) return;
            try {
                await api.delete(`/boards/${board.id}`);
                await loadBoards();
            } catch {
                alert('Failed to delete board.');
            }
        });
    }

    return card;
}

document.getElementById('create-board-btn').addEventListener('click', () => {
    createModal.classList.remove('hidden');
    setTimeout(() => document.getElementById('new-board-title').focus(), 50);
});

document.getElementById('cancel-create').addEventListener('click', closeModal);

createModal.addEventListener('click', (e) => {
    if (e.target === createModal) closeModal();
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !createModal.classList.contains('hidden')) closeModal();
});

function closeModal() {
    createModal.classList.add('hidden');
    createForm.reset();
}

createForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('new-board-title').value.trim();
    const description = document.getElementById('new-board-desc').value.trim() || '';

    const btn = createForm.querySelector('[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Creating...';

    try {
        await api.post('/boards', { title, description });
        closeModal();
        await loadBoards();
    } catch {
        alert('Failed to create board.');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Create';
    }
});

loadBoards();

async function setupSignalR() {
    const hub = new signalR.HubConnectionBuilder()
        .withUrl(`${API_BASE}/hubs/board`, {
            accessTokenFactory: () => localStorage.getItem('accessToken')
        })
        .withAutomaticReconnect()
        .build();

    hub.on('BoardsUpdated', () => loadBoards());

    try {
        await hub.start();
        await hub.invoke('JoinUserChannel');
    } catch { /* ignore */ }
}

setupSignalR();
