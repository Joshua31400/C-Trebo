import { api, getUser, API_BASE } from '../api/client.js';
import { CardModal } from '../components/card-modal.js';

const currentUser = getUser();
if (!currentUser) window.location.href = '/login';

const boardId = parseInt(new URLSearchParams(location.search).get('id'));
if (!boardId) window.location.href = '/boards';

let boardData = null;
let boardLabels = [];
let cardModal = null;
let hubConnection = null;

const dnd = {
    type: null,
    cardId: null,
    sourceColumnId: null,
    cardEl: null,
    columnEl: null,
};

let cardPlaceholder = null;
let columnPlaceholder = null;

const AVATAR_COLORS = ['#6366f1', '#8b5cf6', '#0891b2', '#059669', '#dc2626', '#d97706', '#db2777'];
const avatarColor = (id) => AVATAR_COLORS[(id || 0) % AVATAR_COLORS.length];

function escapeHtml(str) {
    const d = document.createElement('div');
    d.appendChild(document.createTextNode(str || ''));
    return d.innerHTML;
}

function showToast(msg, type = 'success') {
    document.querySelector('.toast')?.remove();
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3000);
}

async function loadBoard(restoreScroll = false) {
    const boardArea = document.getElementById('board-area');
    let savedScroll = 0;
    const savedColScrolls = {};

    if (restoreScroll) {
        savedScroll = boardArea?.scrollLeft || 0;
        document.querySelectorAll('.column').forEach(col => {
            const list = col.querySelector('.cards-list');
            if (list) savedColScrolls[col.dataset.columnId] = list.scrollTop;
        });
    }

    let board, labels;
    try {
        [board, labels] = await Promise.all([
            api.get(`/boards/${boardId}`),
            api.get(`/boards/${boardId}/labels`)
        ]);
    } catch (err) {
        window.location.href = '/boards';
        return;
    }

    boardData = board;
    boardLabels = labels;

    renderBoard();

    if (restoreScroll) {
        if (boardArea) boardArea.scrollLeft = savedScroll;
        document.querySelectorAll('.column').forEach(col => {
            const list = col.querySelector('.cards-list');
            if (list && savedColScrolls[col.dataset.columnId] != null) {
                list.scrollTop = savedColScrolls[col.dataset.columnId];
            }
        });
    }

    cardModal?.updateBoardContext(boardData, boardLabels);
}

function renderBoard() {
    document.title = `${boardData.title} — Trebo`;
    document.getElementById('board-title-display').textContent = boardData.title;
    renderBoardMembersHeader();
    renderColumns();
}

function renderBoardMembersHeader() {
    const container = document.getElementById('board-members-display');
    container.innerHTML = boardData.members.map(m => `
        <div class="member-avatar" style="background:${avatarColor(m.id)};" title="${escapeHtml(m.username)}">
            ${m.username.charAt(0).toUpperCase()}
        </div>`).join('');
}

function renderColumns() {
    const container = document.getElementById('columns-container');
    const addSection = document.getElementById('add-column-section');
    container.querySelectorAll('.column').forEach(c => c.remove());
    for (const col of boardData.columns) {
        container.insertBefore(buildColumnEl(col), addSection);
    }
}

function buildColumnEl(col) {
    const el = document.createElement('div');
    el.className = 'column';
    el.dataset.columnId = col.id;

    el.innerHTML = `
        <div class="column-header flex items-center gap-2 px-3 py-2.5 select-none cursor-grab" draggable="true">
            <h3 class="column-title flex-1 text-white font-semibold text-sm truncate">${escapeHtml(col.title)}</h3>
            <span class="card-count text-slate-400 text-xs">${col.cards.length}</span>
            <div class="relative">
                <button class="col-menu-btn p-1 text-slate-400 hover:text-white rounded hover:bg-white/10 transition-colors" type="button">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"/>
                    </svg>
                </button>
                <div class="col-dropdown hidden absolute right-0 top-full mt-1 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-20 w-44 py-1 text-sm">
                    <button class="col-rename w-full text-left px-4 py-2 text-slate-300 hover:bg-slate-700 hover:text-white" type="button">Rename</button>
                    <button class="col-archive w-full text-left px-4 py-2 text-slate-300 hover:bg-slate-700 hover:text-white" type="button">Archive</button>
                    <div class="my-1 border-t border-slate-700"></div>
                    <button class="col-delete w-full text-left px-4 py-2 text-red-400 hover:bg-slate-700 hover:text-red-300" type="button">Delete</button>
                </div>
            </div>
        </div>

        <div class="cards-list" data-column-id="${col.id}">
            ${col.cards.map(card => buildCardHTML(card, col.id)).join('')}
        </div>

        <div class="px-2 pb-2 pt-1">
            <div class="add-card-form hidden">
                <textarea class="add-card-input w-full bg-slate-700 border border-slate-600 text-white text-sm px-3 py-2 rounded-lg focus:outline-none focus:border-indigo-500 resize-none placeholder-slate-500 mb-2" rows="2" placeholder="Card title..."></textarea>
                <div class="flex gap-2">
                    <button class="confirm-add-card flex-1 bg-indigo-600 hover:bg-indigo-500 text-white text-sm py-1.5 rounded-lg transition-colors font-medium" type="button">Add card</button>
                    <button class="cancel-add-card text-slate-400 hover:text-white text-sm p-1.5 rounded-lg hover:bg-white/10 transition-colors" type="button">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                    </button>
                </div>
            </div>
            <button class="add-card-btn w-full flex items-center gap-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg px-2 py-2 text-sm transition-colors" type="button">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                </svg>
                Add a card
            </button>
        </div>
    `;

    wireColumnEvents(el, col);
    wireColumnHeaderDnd(el, col);
    wireColumnCardDropZone(el, col.id);

    return el;
}

function buildCardHTML(card, colId) {
    const labels = card.labels || [];
    const members = card.members || [];

    const labelsHtml = labels.length > 0 ? `
        <div class="flex flex-wrap gap-1 mb-2">
            ${labels.map(l => `<span class="label-chip" style="background:${l.color};width:40px;" title="${escapeHtml(l.title)}"></span>`).join('')}
        </div>` : '';

    const membersHtml = members.length > 0 ? `
        <div class="flex items-center gap-1 mt-2">
            ${members.map(m => `<div class="member-avatar" style="background:${avatarColor(m.id)};" title="${escapeHtml(m.username)}">${m.username.charAt(0).toUpperCase()}</div>`).join('')}
        </div>` : '';

    return `
        <div class="card rounded-lg px-3 py-2.5 mb-2 select-none"
             draggable="true"
             data-card-id="${card.id}"
             data-column-id="${colId}"
             style="background:#fff;">
            ${labelsHtml}
            <p class="text-sm font-medium leading-snug" style="color:#172b4d;">${escapeHtml(card.title)}</p>
            ${membersHtml}
        </div>`;
}

function wireColumnEvents(el, col) {
    const menuBtn = el.querySelector('.col-menu-btn');
    const dropdown = el.querySelector('.col-dropdown');
    const titleEl = el.querySelector('.column-title');

    menuBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        document.querySelectorAll('.col-dropdown').forEach(d => { if (d !== dropdown) d.classList.add('hidden'); });
        dropdown?.classList.toggle('hidden');
    });

    el.querySelector('.col-rename')?.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown?.classList.add('hidden');
        inlineRenameColumn(el, col, titleEl);
    });

    el.querySelector('.col-archive')?.addEventListener('click', async (e) => {
        e.stopPropagation();
        dropdown?.classList.add('hidden');
        try {
            await api.patch(`/boards/${boardId}/columns/${col.id}/archive`);
            await loadBoard(true);
        } catch { showToast('Failed to archive list.', 'error'); }
    });

    el.querySelector('.col-delete')?.addEventListener('click', async (e) => {
        e.stopPropagation();
        dropdown?.classList.add('hidden');
        if (!confirm(`Delete "${col.title}"? All cards will be permanently deleted.`)) return;
        try {
            await api.delete(`/boards/${boardId}/columns/${col.id}`);
            await loadBoard();
        } catch { showToast('Failed to delete list.', 'error'); }
    });

    titleEl?.addEventListener('click', () => inlineRenameColumn(el, col, titleEl));

    const addCardBtn = el.querySelector('.add-card-btn');
    const addCardForm = el.querySelector('.add-card-form');
    const addCardInput = el.querySelector('.add-card-input');
    const confirmBtn = el.querySelector('.confirm-add-card');
    const cancelBtn = el.querySelector('.cancel-add-card');

    addCardBtn?.addEventListener('click', () => {
        addCardBtn.classList.add('hidden');
        addCardForm?.classList.remove('hidden');
        addCardInput?.focus();
    });

    cancelBtn?.addEventListener('click', () => {
        addCardForm?.classList.add('hidden');
        addCardBtn?.classList.remove('hidden');
        if (addCardInput) addCardInput.value = '';
    });

    addCardInput?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); confirmBtn?.click(); }
        if (e.key === 'Escape') cancelBtn?.click();
    });

    confirmBtn?.addEventListener('click', async () => {
        const title = addCardInput?.value.trim();
        if (!title) return;
        confirmBtn.disabled = true;
        try {
            const newCard = await api.post(`/boards/${boardId}/columns/${col.id}/cards`, { title });
            const list = el.querySelector('.cards-list');
            if (list) {
                list.insertAdjacentHTML('beforeend', buildCardHTML(newCard, col.id));
                wireCardEvents(list.lastElementChild, newCard, col.id);
            }
            const colData = boardData.columns.find(c => c.id === col.id);
            if (colData) {
                colData.cards.push(newCard);
                const countEl = el.querySelector('.card-count');
                if (countEl) countEl.textContent = colData.cards.length;
            }
            if (addCardInput) addCardInput.value = '';
            addCardInput?.focus();
        } catch { showToast('Failed to add card.', 'error'); }
        finally { confirmBtn.disabled = false; }
    });

    el.querySelectorAll('.card').forEach(cardEl => {
        const cardId = parseInt(cardEl.dataset.cardId);
        const colId = parseInt(cardEl.dataset.columnId);
        const colData = boardData.columns.find(c => c.id === colId);
        const cardData = colData?.cards.find(c => c.id === cardId);
        if (cardData) wireCardEvents(cardEl, cardData, colId);
    });
}

function wireCardEvents(cardEl, card, colId) {
    cardEl.addEventListener('click', () => cardModal?.open(card.id, colId));

    cardEl.addEventListener('dragstart', (e) => {
        e.stopPropagation();
        dnd.type = 'card';
        dnd.cardId = card.id;
        dnd.sourceColumnId = colId;
        dnd.cardEl = cardEl;
        cardEl.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
    });

    cardEl.addEventListener('dragend', () => {
        cardEl.classList.remove('dragging');
        removeCardPlaceholder();
        dnd.type = null;
        dnd.cardEl = null;
    });
}

function inlineRenameColumn(colEl, col, titleEl) {
    const input = document.createElement('input');
    input.type = 'text';
    input.value = col.title;
    input.className = 'flex-1 bg-slate-700 border border-indigo-500 text-white text-sm px-2 py-0.5 rounded-md focus:outline-none font-semibold min-w-0';

    titleEl.replaceWith(input);
    input.focus();
    input.select();

    const save = async () => {
        const newTitle = input.value.trim();
        if (!newTitle || newTitle === col.title) { input.replaceWith(titleEl); return; }
        try {
            await api.put(`/boards/${boardId}/columns/${col.id}`, { title: newTitle });
            col.title = newTitle;
            titleEl.textContent = newTitle;
        } catch { /* revert */ }
        input.replaceWith(titleEl);
    };

    input.addEventListener('blur', save);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
        if (e.key === 'Escape') { input.value = col.title; input.blur(); }
    });
}

function wireColumnCardDropZone(colEl, colId) {
    colEl.addEventListener('dragover', (e) => {
        if (dnd.type !== 'card') return;
        e.preventDefault();
        e.stopPropagation();

        const listEl = colEl.querySelector('.cards-list');
        if (!listEl) return;

        const ph = getCardPlaceholder();
        const afterEl = getDragAfterCard(listEl, e.clientY);
        if (afterEl) listEl.insertBefore(ph, afterEl);
        else listEl.appendChild(ph);
    });

    colEl.addEventListener('drop', async (e) => {
        if (dnd.type !== 'card') return;
        e.preventDefault();
        e.stopPropagation();

        const { cardId, sourceColumnId, cardEl: draggedEl } = dnd;
        const ph = cardPlaceholder;

        if (!ph?.parentElement || !draggedEl) { removeCardPlaceholder(); return; }

        ph.parentElement.insertBefore(draggedEl, ph);
        draggedEl.dataset.columnId = colId;
        removeCardPlaceholder();

        const listEl = colEl.querySelector('.cards-list');
        const newCardIds = [...listEl.querySelectorAll('[data-card-id]')].map(el => parseInt(el.dataset.cardId));

        try {
            if (sourceColumnId !== colId) {
                await api.patch(`/boards/${boardId}/columns/${sourceColumnId}/cards/${cardId}/move`, { targetColumnId: colId });
            }
            await api.patch(`/boards/${boardId}/columns/${colId}/cards/reorder`, { ids: newCardIds });
            syncBoardDataAfterCardMove(cardId, sourceColumnId, colId, newCardIds);
            refreshColumnCounts();
        } catch {
            showToast('Failed to move card.', 'error');
            await loadBoard();
        }
    });
}

function getDragAfterCard(listEl, y) {
    const cards = [...listEl.querySelectorAll('.card:not(.dragging)')];
    return cards.reduce((closest, card) => {
        const box = card.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) return { offset, element: card };
        return closest;
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

function getCardPlaceholder() {
    if (!cardPlaceholder) {
        cardPlaceholder = document.createElement('div');
        cardPlaceholder.className = 'card-drag-placeholder';
    }
    return cardPlaceholder;
}

function removeCardPlaceholder() {
    cardPlaceholder?.parentElement?.removeChild(cardPlaceholder);
}

function syncBoardDataAfterCardMove(cardId, sourceColId, targetColId, newTargetOrder) {
    const sourceCol = boardData.columns.find(c => c.id === sourceColId);
    const targetCol = boardData.columns.find(c => c.id === targetColId);
    if (!sourceCol || !targetCol) return;

    if (sourceColId !== targetColId) {
        const idx = sourceCol.cards.findIndex(c => c.id === cardId);
        if (idx !== -1) {
            const [movedCard] = sourceCol.cards.splice(idx, 1);
            movedCard.columnId = targetColId;
            const rebuilt = newTargetOrder.map(id => {
                if (id === cardId) return movedCard;
                return targetCol.cards.find(c => c.id === id);
            }).filter(Boolean);
            targetCol.cards = rebuilt;
        }
    } else {
        targetCol.cards.sort((a, b) => newTargetOrder.indexOf(a.id) - newTargetOrder.indexOf(b.id));
    }
}

function refreshColumnCounts() {
    document.querySelectorAll('.column').forEach(colEl => {
        const colId = parseInt(colEl.dataset.columnId);
        const colData = boardData.columns.find(c => c.id === colId);
        const countEl = colEl.querySelector('.card-count');
        if (countEl && colData) countEl.textContent = colData.cards.length;
    });
}

function wireColumnHeaderDnd(colEl, col) {
    const header = colEl.querySelector('.column-header');
    if (!header) return;

    header.addEventListener('dragstart', (e) => {
        dnd.type = 'column';
        dnd.columnId = col.id;
        dnd.columnEl = colEl;
        e.dataTransfer.effectAllowed = 'move';
        try { e.dataTransfer.setDragImage(colEl, 20, 20); } catch { /* ignore */ }
        setTimeout(() => colEl.classList.add('column-dragging'), 0);
    });

    header.addEventListener('dragend', () => {
        colEl.classList.remove('column-dragging');
        removeColumnPlaceholder();
        dnd.type = null;
        dnd.columnEl = null;
    });
}

function setupColumnsContainerDnd() {
    const container = document.getElementById('columns-container');

    container.addEventListener('dragover', (e) => {
        if (dnd.type !== 'column') return;
        e.preventDefault();

        const addSection = document.getElementById('add-column-section');
        const ph = getColumnPlaceholder();
        const afterEl = getDragAfterColumn(container, e.clientX);

        if (afterEl) container.insertBefore(ph, afterEl);
        else container.insertBefore(ph, addSection);
    });

    container.addEventListener('drop', async (e) => {
        if (dnd.type !== 'column') return;
        e.preventDefault();

        const { columnEl: draggedCol } = dnd;
        const ph = columnPlaceholder;

        if (!ph?.parentElement || !draggedCol) { removeColumnPlaceholder(); return; }

        ph.parentElement.insertBefore(draggedCol, ph);
        removeColumnPlaceholder();

        const colIds = [...container.querySelectorAll('.column')].map(el => parseInt(el.dataset.columnId));

        try {
            await api.patch(`/boards/${boardId}/columns/reorder`, { ids: colIds });
            boardData.columns.sort((a, b) => colIds.indexOf(a.id) - colIds.indexOf(b.id));
        } catch {
            showToast('Failed to reorder lists.', 'error');
            await loadBoard();
        }
    });
}

function getDragAfterColumn(container, x) {
    const columns = [...container.querySelectorAll('.column:not(.column-dragging)')];
    return columns.reduce((closest, col) => {
        const box = col.getBoundingClientRect();
        const offset = x - box.left - box.width / 2;
        if (offset < 0 && offset > closest.offset) return { offset, element: col };
        return closest;
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

function getColumnPlaceholder() {
    if (!columnPlaceholder) {
        columnPlaceholder = document.createElement('div');
        columnPlaceholder.className = 'column-drag-placeholder flex-shrink-0';
    }
    return columnPlaceholder;
}

function removeColumnPlaceholder() {
    columnPlaceholder?.parentElement?.removeChild(columnPlaceholder);
}

function setupBoardTitleEdit() {
    const titleDisplay = document.getElementById('board-title-display');

    titleDisplay?.addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'text';
        input.value = boardData.title;
        input.className = 'bg-white/10 border border-white/30 text-white text-sm font-bold px-2 py-0.5 rounded-md focus:outline-none focus:border-white/60';
        input.style.minWidth = '8rem';

        titleDisplay.replaceWith(input);
        input.focus();
        input.select();

        const save = async () => {
            const newTitle = input.value.trim();
            if (!newTitle || newTitle === boardData.title) { input.replaceWith(titleDisplay); return; }
            try {
                await api.put(`/boards/${boardId}`, { title: newTitle });
                boardData.title = newTitle;
                titleDisplay.textContent = newTitle;
                document.title = `${newTitle} — Trebo`;
            } catch { /* revert */ }
            input.replaceWith(titleDisplay);
        };

        input.addEventListener('blur', save);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
            if (e.key === 'Escape') { input.value = boardData.title; input.blur(); }
        });
    });
}

function setupAddColumn() {
    const showBtn = document.getElementById('show-add-column');
    const form = document.getElementById('add-column-form');
    const input = document.getElementById('new-column-title');
    const confirmBtn = document.getElementById('confirm-add-column');
    const cancelBtn = document.getElementById('cancel-add-column');

    showBtn?.addEventListener('click', () => {
        showBtn.classList.add('hidden');
        form?.classList.remove('hidden');
        input?.focus();
    });

    cancelBtn?.addEventListener('click', () => {
        form?.classList.add('hidden');
        showBtn?.classList.remove('hidden');
        if (input) input.value = '';
    });

    input?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); confirmBtn?.click(); }
        if (e.key === 'Escape') cancelBtn?.click();
    });

    confirmBtn?.addEventListener('click', async () => {
        const title = input?.value.trim();
        if (!title) return;
        confirmBtn.disabled = true;
        try {
            await api.post(`/boards/${boardId}/columns`, { title });
            if (input) input.value = '';
            await loadBoard();
            form?.classList.add('hidden');
            showBtn?.classList.remove('hidden');
            const boardArea = document.getElementById('board-area');
            if (boardArea) boardArea.scrollLeft = boardArea.scrollWidth;
        } catch { showToast('Failed to add list.', 'error'); }
        finally { confirmBtn.disabled = false; }
    });
}

function setupMembersPanel() {
    document.getElementById('members-btn')?.addEventListener('click', () => {
        renderMembersPanel();
        document.getElementById('members-panel')?.classList.remove('hidden');
    });

    document.getElementById('close-members-panel')?.addEventListener('click', () => {
        document.getElementById('members-panel')?.classList.add('hidden');
    });

    document.getElementById('members-panel')?.addEventListener('click', (e) => {
        if (e.target === document.getElementById('members-panel')) {
            document.getElementById('members-panel')?.classList.add('hidden');
        }
    });

    document.getElementById('confirm-add-member')?.addEventListener('click', async () => {
        const usernameInput = document.getElementById('add-member-username');
        const username = usernameInput?.value.trim();
        if (!username) return;

        if (boardData.creator.id !== currentUser.id) {
            showToast('Only the board owner can add members.', 'error');
            return;
        }
        try {
            const found = await api.get(`/users/lookup?username=${encodeURIComponent(username)}`);
            await api.post(`/boards/${boardId}/members/${found.id}`);
            if (usernameInput) usernameInput.value = '';
            await loadBoard(true);
            renderMembersPanel();
            showToast('Member added.');
        } catch (err) {
            if (err.message?.includes('already')) {
                showToast('User is already a member.', 'error');
            } else if (err.message?.includes('404') || err.message?.includes('Not Found')) {
                showToast('User not found.', 'error');
            } else {
                showToast('Failed to add member.', 'error');
            }
        }
    });
}

function renderMembersPanel() {
    const list = document.getElementById('members-list');
    if (!list) return;

    const isOwner = boardData.creator.id === currentUser.id;

    list.innerHTML = boardData.members.map(m => {
        const isCreator = m.id === boardData.creator.id;
        const canRemove = isOwner && !isCreator;
        return `
            <div class="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-700 transition-colors">
                <div class="member-avatar" style="background:${avatarColor(m.id)};">${m.username.charAt(0).toUpperCase()}</div>
                <span class="text-white text-sm flex-1 truncate">${escapeHtml(m.username)}</span>
                ${isCreator ? '<span class="text-slate-500 text-xs">Owner</span>' : ''}
                ${canRemove ? `<button class="rm-member text-slate-500 hover:text-red-400 transition-colors p-1 rounded" data-id="${m.id}">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg></button>` : ''}
            </div>`;
    }).join('');

    list.querySelectorAll('.rm-member').forEach(btn => {
        btn.addEventListener('click', async () => {
            try {
                await api.delete(`/boards/${boardId}/members/${btn.dataset.id}`);
                await loadBoard(true);
                renderMembersPanel();
            } catch { showToast('Failed to remove member.', 'error'); }
        });
    });
}

document.addEventListener('click', () => {
    document.querySelectorAll('.col-dropdown').forEach(d => d.classList.add('hidden'));
});

function setupArchivePanel() {
    document.getElementById('archive-btn')?.addEventListener('click', async () => {
        document.getElementById('archive-panel')?.classList.remove('hidden');
        await loadArchived();
    });

    document.getElementById('close-archive-panel')?.addEventListener('click', () => {
        document.getElementById('archive-panel')?.classList.add('hidden');
    });

    document.getElementById('archive-panel')?.addEventListener('click', (e) => {
        if (e.target === document.getElementById('archive-panel')) {
            document.getElementById('archive-panel').classList.add('hidden');
        }
    });
}

async function loadArchived() {
    const content = document.getElementById('archive-content');
    if (!content) return;
    content.innerHTML = '<p class="text-slate-500 text-sm">Loading...</p>';

    try {
        const data = await api.get(`/boards/${boardId}/archived`);

        if (data.columns.length === 0 && data.cards.length === 0) {
            content.innerHTML = '<p class="text-slate-500 text-sm text-center py-8">No archived items.</p>';
            return;
        }

        let html = '';

        if (data.columns.length > 0) {
            html += `
                <h4 class="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Lists</h4>
                <div class="space-y-2 mb-5">
                    ${data.columns.map(c => `
                        <div class="flex items-center gap-2 bg-slate-700/50 rounded-lg px-3 py-2">
                            <span class="text-white text-sm flex-1 truncate">${escapeHtml(c.title)}</span>
                            <button class="restore-col text-xs text-indigo-400 hover:text-indigo-300 transition-colors flex-shrink-0" data-id="${c.id}">Restore</button>
                        </div>`).join('')}
                </div>`;
        }

        if (data.cards.length > 0) {
            html += `
                <h4 class="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Cards</h4>
                <div class="space-y-2">
                    ${data.cards.map(c => `
                        <div class="flex items-start gap-2 bg-slate-700/50 rounded-lg px-3 py-2">
                            <div class="flex-1 min-w-0">
                                <p class="text-white text-sm truncate">${escapeHtml(c.title)}</p>
                                <p class="text-slate-500 text-xs truncate">${escapeHtml(c.columnTitle)}</p>
                            </div>
                            <button class="restore-card text-xs text-indigo-400 hover:text-indigo-300 transition-colors flex-shrink-0 mt-0.5" data-id="${c.id}" data-col="${c.columnId}">Restore</button>
                        </div>`).join('')}
                </div>`;
        }

        content.innerHTML = html;

        content.querySelectorAll('.restore-col').forEach(btn => {
            btn.addEventListener('click', async () => {
                try {
                    await api.patch(`/boards/${boardId}/columns/${btn.dataset.id}/archive`);
                    await loadArchived();
                } catch { showToast('Failed to restore list.', 'error'); }
            });
        });

        content.querySelectorAll('.restore-card').forEach(btn => {
            btn.addEventListener('click', async () => {
                try {
                    await api.patch(`/boards/${boardId}/columns/${btn.dataset.col}/cards/${btn.dataset.id}/archive`);
                    await loadArchived();
                } catch { showToast('Failed to restore card.', 'error'); }
            });
        });
    } catch {
        content.innerHTML = '<p class="text-red-400 text-sm">Failed to load archived items.</p>';
    }
}

async function setupSignalR() {
    hubConnection = new signalR.HubConnectionBuilder()
        .withUrl(`${API_BASE}/hubs/board`, {
            accessTokenFactory: () => localStorage.getItem('accessToken')
        })
        .withAutomaticReconnect()
        .build();

    hubConnection.on('BoardRefresh', () => loadBoard(true));
    hubConnection.on('BoardDeleted', () => { window.location.href = '/boards'; });

    try {
        await hubConnection.start();
        await hubConnection.invoke('JoinBoard', boardId);
    } catch (e) {
        console.warn('SignalR connection failed:', e);
    }

    window.addEventListener('beforeunload', () => hubConnection.stop());
}

async function init() {
    try {
        await loadBoard();

        cardModal = new CardModal(boardId, (doReload = true) => {
            if (doReload) loadBoard(true);
        });
        cardModal.updateBoardContext(boardData, boardLabels);

        setupColumnsContainerDnd();
        setupBoardTitleEdit();
        setupAddColumn();
        setupMembersPanel();
        setupArchivePanel();
        setupSignalR();
    } catch (err) {
        showToast('Failed to load board.', 'error');
        console.error(err);
    }
}

init();
