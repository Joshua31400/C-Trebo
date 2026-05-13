import { api, getUser } from '../api/client.js';

const AVATAR_COLORS = ['#6366f1', '#8b5cf6', '#0891b2', '#059669', '#dc2626', '#d97706', '#db2777'];

function avatarColor(id) {
    return AVATAR_COLORS[id % AVATAR_COLORS.length];
}

function escapeHtml(str) {
    const d = document.createElement('div');
    d.appendChild(document.createTextNode(str || ''));
    return d.innerHTML;
}

function formatDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTime(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export class CardModal {
    constructor(boardId, onBoardUpdate) {
        this.boardId = boardId;
        this.onBoardUpdate = onBoardUpdate;
        this.boardData = null;
        this.boardLabels = [];
        this.card = null;
        this.comments = [];
        this.columnId = null;

        this.backdropEl = document.getElementById('card-modal');
        this.contentEl = document.getElementById('card-modal-content');

        this.backdropEl.addEventListener('click', (e) => {
            if (e.target === this.backdropEl) this.close();
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !this.backdropEl.classList.contains('hidden')) this.close();
        });
    }

    updateBoardContext(boardData, boardLabels) {
        this.boardData = boardData;
        this.boardLabels = boardLabels;
    }

    async open(cardId, columnId) {
        this.columnId = columnId;
        this.contentEl.innerHTML = `
            <div class="flex items-center justify-center py-16">
                <div class="text-slate-400 text-sm">Loading...</div>
            </div>`;
        this.backdropEl.classList.remove('hidden');

        try {
            const [card, comments] = await Promise.all([
                api.get(`/boards/${this.boardId}/columns/${columnId}/cards/${cardId}`),
                api.get(`/boards/${this.boardId}/columns/${columnId}/cards/${cardId}/comments`)
            ]);
            this.card = card;
            this.comments = comments;
            this.render();
        } catch {
            this.contentEl.innerHTML = `<div class="p-8 text-red-400 text-sm">Failed to load card.</div>`;
        }
    }

    close() {
        this.backdropEl.classList.add('hidden');
        this.contentEl.innerHTML = '';
        if (this.onBoardUpdate) this.onBoardUpdate();
    }

    render() {
        const card = this.card;
        const col = this.boardData?.columns?.find(c => c.id === this.columnId);
        const currentUser = getUser();

        const cardLabels = Array.isArray(card.labels) ? card.labels : [];
        const cardMembers = Array.isArray(card.members) ? card.members : [];

        this.contentEl.innerHTML = `
            <div class="p-6">
                <div class="flex items-start gap-3 mb-1">
                    <div class="flex-1 min-w-0">
                        <div id="modal-title-display" class="text-xl font-bold text-white leading-snug cursor-text hover:bg-white/5 rounded px-1 -mx-1 transition-colors"
                            title="Click to edit">${escapeHtml(card.title)}</div>
                        <input id="modal-title-input" type="text" value="${escapeHtml(card.title)}"
                            class="hidden w-full text-xl font-bold text-white bg-slate-700 border border-indigo-500 rounded px-2 py-0.5 focus:outline-none">
                    </div>
                    <button id="modal-close-btn" class="flex-shrink-0 text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                <p class="text-slate-500 text-xs mb-6 px-1">
                    in list <span class="text-slate-400">${escapeHtml(col?.title || '')}</span>
                    &nbsp;·&nbsp; created ${formatDate(card.createdAt)}
                </p>

                <div class="flex gap-5">
                    <div class="flex-1 min-w-0 space-y-6">

                        <div>
                            <h4 class="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h7" />
                                </svg>
                                Description
                            </h4>
                            <textarea id="modal-desc"
                                class="w-full bg-slate-700/60 text-white text-sm p-3 rounded-lg border border-slate-600 focus:outline-none focus:border-indigo-500 resize-none transition-colors min-h-[80px] placeholder-slate-500"
                                placeholder="Add a description...">${escapeHtml(card.description || '')}</textarea>
                            <div id="desc-actions" class="hidden flex gap-2 mt-2">
                                <button id="save-desc" class="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg transition-colors">Save</button>
                                <button id="cancel-desc" class="text-slate-400 hover:text-white text-sm px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors">Cancel</button>
                            </div>
                        </div>

                        <div>
                            <h4 class="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                </svg>
                                Comments
                            </h4>

                            <div class="flex gap-3 mb-4">
                                <div class="member-avatar flex-shrink-0" style="background: ${avatarColor(currentUser?.id || 0)};">
                                    ${(currentUser?.username || '?').charAt(0).toUpperCase()}
                                </div>
                                <div class="flex-1">
                                    <textarea id="new-comment-input" rows="1"
                                        class="w-full bg-slate-700/60 text-white text-sm p-2.5 rounded-lg border border-slate-600 focus:outline-none focus:border-indigo-500 resize-none placeholder-slate-500 transition-colors"
                                        placeholder="Write a comment..."></textarea>
                                    <button id="submit-comment" class="hidden mt-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg transition-colors">
                                        Save
                                    </button>
                                </div>
                            </div>

                            <div id="comments-list" class="space-y-4">
                                ${this.renderComments()}
                            </div>
                        </div>
                    </div>

                    <div class="w-40 flex-shrink-0 space-y-5">

                        <div>
                            <h4 class="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Labels</h4>
                            <div id="card-labels-list" class="flex flex-wrap gap-1 mb-2">
                                ${cardLabels.map(l => this.renderLabelChip(l, true)).join('')}
                                ${cardLabels.length === 0 ? '<span class="text-slate-600 text-xs">None</span>' : ''}
                            </div>
                            <div class="relative">
                                <button id="labels-toggle" class="text-xs text-slate-400 hover:text-white bg-slate-700 hover:bg-slate-600 rounded-lg px-2 py-1.5 transition-colors w-full text-left">
                                    Edit labels
                                </button>
                                <div id="labels-dropdown" class="hidden absolute left-0 top-full mt-1 z-10 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl p-2 w-52 max-h-56 overflow-y-auto">
                                    ${this.renderLabelsDropdown(cardLabels)}
                                </div>
                            </div>
                        </div>

                        <div>
                            <h4 class="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Members</h4>
                            <div id="card-members-list" class="flex flex-wrap gap-1 mb-2">
                                ${cardMembers.map(m => `
                                    <div class="member-avatar" style="background: ${avatarColor(m.id)};" title="${escapeHtml(m.username)}">
                                        ${m.username.charAt(0).toUpperCase()}
                                    </div>`).join('')}
                                ${cardMembers.length === 0 ? '<span class="text-slate-600 text-xs">None</span>' : ''}
                            </div>
                            <div class="relative">
                                <button id="members-toggle" class="text-xs text-slate-400 hover:text-white bg-slate-700 hover:bg-slate-600 rounded-lg px-2 py-1.5 transition-colors w-full text-left">
                                    Edit members
                                </button>
                                <div id="members-dropdown" class="hidden absolute left-0 top-full mt-1 z-10 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl p-2 w-48 max-h-56 overflow-y-auto">
                                    ${this.renderMembersDropdown(cardMembers)}
                                </div>
                            </div>
                        </div>

                        <div>
                            <h4 class="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Actions</h4>
                            <button id="archive-card-btn" class="w-full text-left text-xs text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-600 rounded-lg px-2 py-2 transition-colors mb-1.5">
                                Archive card
                            </button>
                            <button id="delete-card-btn" class="w-full text-left text-xs text-red-400 hover:text-red-300 bg-slate-700 hover:bg-red-900/30 rounded-lg px-2 py-2 transition-colors">
                                Delete card
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.bindEvents();
    }

    renderComments() {
        const currentUser = getUser();
        if (!this.comments || this.comments.length === 0) {
            return '<p class="text-slate-600 text-sm">No comments yet.</p>';
        }
        return this.comments.map(c => {
            const isOwn = c.creator?.id === currentUser?.id;
            return `
                <div class="flex gap-3" data-comment-id="${c.id}">
                    <div class="member-avatar flex-shrink-0" style="background: ${avatarColor(c.creator?.id || 0)};">
                        ${(c.creator?.username || '?').charAt(0).toUpperCase()}
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="flex items-baseline gap-2 mb-1">
                            <span class="text-white text-sm font-semibold">${escapeHtml(c.creator?.username || 'Unknown')}</span>
                            <span class="text-slate-500 text-xs">${formatTime(c.createdAt)}</span>
                        </div>
                        <div class="comment-content text-slate-300 text-sm bg-slate-700/50 rounded-lg px-3 py-2">${escapeHtml(c.content)}</div>
                        <textarea class="comment-edit-input hidden w-full bg-slate-700 border border-indigo-500 text-white text-sm p-2 rounded-lg focus:outline-none resize-none mt-1"
                            rows="2">${escapeHtml(c.content)}</textarea>
                        ${isOwn ? `
                        <div class="comment-view-actions flex gap-3 mt-1">
                            <button class="edit-comment text-xs text-slate-500 hover:text-slate-300 transition-colors" data-id="${c.id}">Edit</button>
                            <button class="delete-comment text-xs text-slate-500 hover:text-red-400 transition-colors" data-id="${c.id}">Delete</button>
                        </div>
                        <div class="comment-edit-actions hidden flex gap-2 mt-1">
                            <button class="save-comment text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-2 py-1 rounded transition-colors" data-id="${c.id}">Save</button>
                            <button class="cancel-edit-comment text-xs text-slate-400 hover:text-white px-2 py-1 rounded hover:bg-white/10 transition-colors">Cancel</button>
                        </div>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }

    renderLabelChip(label, withRemove = false) {
        return `
            <span class="inline-flex items-center gap-1 rounded-full text-white text-xs px-2 py-0.5 font-medium" style="background: ${label.color};">
                ${escapeHtml(label.title)}
                ${withRemove ? `<button class="remove-label hover:opacity-75 transition-opacity" data-label-id="${label.id}" style="line-height:1">×</button>` : ''}
            </span>`;
    }

    renderLabelsDropdown(cardLabels) {
        const cardLabelIds = new Set(cardLabels.map(l => l.id));
        if (!this.boardLabels || this.boardLabels.length === 0) {
            return `
                <p class="text-slate-500 text-xs text-center py-2">No labels available</p>
                <div class="mt-2 pt-2 border-t border-slate-700">
                    <p class="text-slate-400 text-xs mb-1.5">Create label</p>
                    <input type="text" id="new-label-title" placeholder="Title" class="w-full bg-slate-700 border border-slate-600 text-white text-xs px-2 py-1.5 rounded-lg focus:outline-none focus:border-indigo-500 mb-1">
                    <input type="color" id="new-label-color" value="#6366f1" class="w-full h-7 rounded cursor-pointer mb-1 bg-transparent">
                    <button id="create-label-btn" class="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs py-1.5 rounded-lg transition-colors">Create</button>
                </div>`;
        }

        const currentUser = getUser();
        const isOwner = this.boardData?.creator?.id === currentUser?.id;

        const labelsHtml = this.boardLabels.map(l => {
            const active = cardLabelIds.has(l.id);
            const canDelete = isOwner && !l.isDefault;
            return `
                <div class="flex items-center gap-1">
                    <button class="toggle-label flex-1 flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-slate-700 transition-colors text-left ${active ? 'bg-slate-700/50' : ''}"
                        data-label-id="${l.id}" data-active="${active}">
                        <span class="w-4 h-4 rounded flex-shrink-0 flex items-center justify-center" style="background: ${l.color};">
                            ${active ? '<svg class="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>' : ''}
                        </span>
                        <span class="text-slate-300 text-xs flex-1 truncate">${escapeHtml(l.title)}</span>
                    </button>
                    ${canDelete ? `<button class="delete-board-label flex-shrink-0 p-1 text-slate-600 hover:text-red-400 transition-colors rounded" data-label-id="${l.id}" title="Delete label">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>` : ''}
                </div>`;
        }).join('');

        return `
            ${labelsHtml}
            <div class="mt-2 pt-2 border-t border-slate-700">
                <p class="text-slate-400 text-xs mb-1.5">Create label</p>
                <input type="text" id="new-label-title" placeholder="Title" class="w-full bg-slate-700 border border-slate-600 text-white text-xs px-2 py-1.5 rounded-lg focus:outline-none focus:border-indigo-500 mb-1">
                <input type="color" id="new-label-color" value="#6366f1" class="w-full h-7 rounded cursor-pointer mb-1 bg-transparent border border-slate-600">
                <button id="create-label-btn" class="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs py-1.5 rounded-lg transition-colors">Create & Add</button>
            </div>`;
    }

    renderMembersDropdown(cardMembers) {
        const cardMemberIds = new Set(cardMembers.map(m => m.id));
        const boardMembers = this.boardData?.members || [];
        if (boardMembers.length === 0) return '<p class="text-slate-500 text-xs text-center py-2">No members</p>';

        return boardMembers.map(m => {
            const active = cardMemberIds.has(m.id);
            return `
                <button class="toggle-member w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-slate-700 transition-colors text-left ${active ? 'bg-slate-700/50' : ''}"
                    data-member-id="${m.id}" data-active="${active}">
                    <div class="member-avatar flex-shrink-0" style="background: ${avatarColor(m.id)};">${m.username.charAt(0).toUpperCase()}</div>
                    <span class="text-slate-300 text-xs flex-1 truncate">${escapeHtml(m.username)}</span>
                    ${active ? `<svg class="w-3 h-3 text-indigo-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>` : ''}
                </button>`;
        }).join('');
    }

    async refreshComments() {
        try {
            this.comments = await api.get(`/boards/${this.boardId}/columns/${this.columnId}/cards/${this.card.id}/comments`);
            const list = document.getElementById('comments-list');
            if (list) list.innerHTML = this.renderComments();
            this.bindCommentEvents();
        } catch { /* ignore */ }
    }

    async refreshLabels() {
        try {
            const refreshed = await api.get(`/boards/${this.boardId}/columns/${this.columnId}/cards/${this.card.id}`);
            this.card = refreshed;
            const cardLabels = Array.isArray(refreshed.labels) ? refreshed.labels : [];

            const list = document.getElementById('card-labels-list');
            if (list) {
                list.innerHTML = cardLabels.map(l => this.renderLabelChip(l, true)).join('') ||
                    '<span class="text-slate-600 text-xs">None</span>';
                this.bindLabelRemoveEvents();
            }
            const dropdown = document.getElementById('labels-dropdown');
            if (dropdown && !dropdown.classList.contains('hidden')) {
                dropdown.innerHTML = this.renderLabelsDropdown(cardLabels);
                this.bindLabelsDropdownEvents();
            }
        } catch { /* ignore */ }
    }

    async refreshMembers() {
        try {
            const refreshed = await api.get(`/boards/${this.boardId}/columns/${this.columnId}/cards/${this.card.id}`);
            this.card = refreshed;
            const cardMembers = Array.isArray(refreshed.members) ? refreshed.members : [];

            const list = document.getElementById('card-members-list');
            if (list) {
                list.innerHTML = cardMembers.map(m => `
                    <div class="member-avatar" style="background: ${avatarColor(m.id)};" title="${escapeHtml(m.username)}">
                        ${m.username.charAt(0).toUpperCase()}
                    </div>`).join('') || '<span class="text-slate-600 text-xs">None</span>';
            }
            const dropdown = document.getElementById('members-dropdown');
            if (dropdown && !dropdown.classList.contains('hidden')) {
                dropdown.innerHTML = this.renderMembersDropdown(cardMembers);
                this.bindMembersDropdownEvents();
            }
        } catch { /* ignore */ }
    }

    bindEvents() {
        document.getElementById('modal-close-btn')?.addEventListener('click', () => this.close());

        this.bindTitleEdit();
        this.bindDescriptionEdit();
        this.bindCommentEvents();
        this.bindLabelRemoveEvents();
        this.bindLabelsToggle();
        this.bindMembersToggle();
        this.bindActionButtons();

        document.getElementById('modal-close-btn')?.closest('#card-modal-content')
            ?.addEventListener('click', (e) => {
                const labelsDropdown = document.getElementById('labels-dropdown');
                const membersDropdown = document.getElementById('members-dropdown');
                if (labelsDropdown && !labelsDropdown.contains(e.target) && !document.getElementById('labels-toggle')?.contains(e.target)) {
                    labelsDropdown.classList.add('hidden');
                }
                if (membersDropdown && !membersDropdown.contains(e.target) && !document.getElementById('members-toggle')?.contains(e.target)) {
                    membersDropdown.classList.add('hidden');
                }
            });
    }

    bindTitleEdit() {
        const display = document.getElementById('modal-title-display');
        const input = document.getElementById('modal-title-input');
        if (!display || !input) return;

        const enterEdit = () => {
            display.classList.add('hidden');
            input.classList.remove('hidden');
            input.focus();
            input.select();
        };

        const saveTitle = async () => {
            const newTitle = input.value.trim();
            if (!newTitle || newTitle === this.card.title) {
                display.classList.remove('hidden');
                input.classList.add('hidden');
                input.value = this.card.title;
                return;
            }
            try {
                await api.put(`/boards/${this.boardId}/columns/${this.columnId}/cards/${this.card.id}`, { title: newTitle });
                this.card.title = newTitle;
                display.textContent = newTitle;
            } catch { input.value = this.card.title; }
            display.classList.remove('hidden');
            input.classList.add('hidden');
        };

        display.addEventListener('click', enterEdit);
        input.addEventListener('blur', saveTitle);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
            if (e.key === 'Escape') { input.value = this.card.title; input.blur(); }
        });
    }

    bindDescriptionEdit() {
        const textarea = document.getElementById('modal-desc');
        const actions = document.getElementById('desc-actions');
        if (!textarea || !actions) return;

        const originalDesc = this.card.description || '';

        textarea.addEventListener('focus', () => actions.classList.remove('hidden'));

        document.getElementById('save-desc')?.addEventListener('click', async () => {
            const newDesc = textarea.value;
            try {
                await api.put(`/boards/${this.boardId}/columns/${this.columnId}/cards/${this.card.id}`, { description: newDesc });
                this.card.description = newDesc;
                actions.classList.add('hidden');
                textarea.blur();
            } catch { textarea.value = this.card.description || ''; }
        });

        document.getElementById('cancel-desc')?.addEventListener('click', () => {
            textarea.value = this.card.description || '';
            actions.classList.add('hidden');
            textarea.blur();
        });
    }

    bindCommentEvents() {
        const input = document.getElementById('new-comment-input');
        const submitBtn = document.getElementById('submit-comment');

        input?.addEventListener('focus', () => submitBtn?.classList.remove('hidden'));

        submitBtn?.addEventListener('click', async () => {
            const content = input?.value.trim();
            if (!content) return;
            try {
                await api.post(`/boards/${this.boardId}/columns/${this.columnId}/cards/${this.card.id}/comments`, { content });
                if (input) input.value = '';
                submitBtn?.classList.add('hidden');
                await this.refreshComments();
            } catch { /* ignore */ }
        });

        input?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                submitBtn?.click();
            }
        });

        this.bindCommentEditEvents();
    }

    bindCommentEditEvents() {
        document.querySelectorAll('.edit-comment').forEach(btn => {
            btn.addEventListener('click', () => {
                const container = btn.closest('[data-comment-id]');
                container?.querySelector('.comment-content')?.classList.add('hidden');
                container?.querySelector('.comment-edit-input')?.classList.remove('hidden');
                container?.querySelector('.comment-view-actions')?.classList.add('hidden');
                container?.querySelector('.comment-edit-actions')?.classList.remove('hidden');
                container?.querySelector('.comment-edit-input')?.focus();
            });
        });

        document.querySelectorAll('.cancel-edit-comment').forEach(btn => {
            btn.addEventListener('click', () => {
                const container = btn.closest('[data-comment-id]');
                const content = container?.querySelector('.comment-content');
                const editInput = container?.querySelector('.comment-edit-input');
                if (editInput && content) editInput.value = content.textContent;
                content?.classList.remove('hidden');
                editInput?.classList.add('hidden');
                container?.querySelector('.comment-view-actions')?.classList.remove('hidden');
                container?.querySelector('.comment-edit-actions')?.classList.add('hidden');
            });
        });

        document.querySelectorAll('.save-comment').forEach(btn => {
            btn.addEventListener('click', async () => {
                const commentId = btn.dataset.id;
                const container = btn.closest('[data-comment-id]');
                const editInput = container?.querySelector('.comment-edit-input');
                const content = editInput?.value.trim();
                if (!content) return;
                try {
                    await api.put(`/boards/${this.boardId}/columns/${this.columnId}/cards/${this.card.id}/comments/${commentId}`, { content });
                    await this.refreshComments();
                } catch { /* ignore */ }
            });
        });

        document.querySelectorAll('.delete-comment').forEach(btn => {
            btn.addEventListener('click', async () => {
                const commentId = btn.dataset.id;
                if (!confirm('Delete this comment?')) return;
                try {
                    await api.delete(`/boards/${this.boardId}/columns/${this.columnId}/cards/${this.card.id}/comments/${commentId}`);
                    await this.refreshComments();
                } catch { /* ignore */ }
            });
        });
    }

    bindLabelRemoveEvents() {
        document.querySelectorAll('.remove-label').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const labelId = btn.dataset.labelId;
                try {
                    await api.delete(`/boards/${this.boardId}/columns/${this.columnId}/cards/${this.card.id}/labels/${labelId}`);
                    await this.refreshLabels();
                } catch { /* ignore */ }
            });
        });
    }

    bindLabelsToggle() {
        const toggleBtn = document.getElementById('labels-toggle');
        const dropdown = document.getElementById('labels-dropdown');
        if (!toggleBtn || !dropdown) return;

        toggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('hidden');
            if (!dropdown.classList.contains('hidden')) {
                this.bindLabelsDropdownEvents();
            }
        });
    }

    bindLabelsDropdownEvents() {
        const dropdown = document.getElementById('labels-dropdown');
        if (!dropdown) return;

        dropdown.querySelectorAll('.toggle-label').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const labelId = btn.dataset.labelId;
                const active = btn.dataset.active === 'true';
                try {
                    if (active) {
                        await api.delete(`/boards/${this.boardId}/columns/${this.columnId}/cards/${this.card.id}/labels/${labelId}`);
                    } else {
                        await api.post(`/boards/${this.boardId}/columns/${this.columnId}/cards/${this.card.id}/labels/${labelId}`);
                    }
                    await this.refreshLabels();
                } catch { /* ignore */ }
            });
        });

        dropdown.querySelectorAll('.delete-board-label').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const labelId = btn.dataset.labelId;
                if (!confirm('Delete this label from the board? It will be removed from all cards.')) return;
                try {
                    await api.delete(`/boards/${this.boardId}/labels/${labelId}`);
                    this.boardLabels = await api.get(`/boards/${this.boardId}/labels`);
                    await this.refreshLabels();
                    if (this.onBoardUpdate) this.onBoardUpdate(false);
                } catch { /* ignore */ }
            });
        });

        document.getElementById('create-label-btn')?.addEventListener('click', async (e) => {
            e.stopPropagation();
            const title = document.getElementById('new-label-title')?.value.trim();
            const color = document.getElementById('new-label-color')?.value || '#6366f1';
            if (!title) return;
            try {
                const newLabel = await api.post(`/boards/${this.boardId}/labels`, { title, color });
                await api.post(`/boards/${this.boardId}/columns/${this.columnId}/cards/${this.card.id}/labels/${newLabel.id}`);
                if (this.onBoardUpdate) this.onBoardUpdate(false);
                await this.refreshLabels();
            } catch { /* ignore */ }
        });
    }

    bindMembersToggle() {
        const toggleBtn = document.getElementById('members-toggle');
        const dropdown = document.getElementById('members-dropdown');
        if (!toggleBtn || !dropdown) return;

        toggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('hidden');
            if (!dropdown.classList.contains('hidden')) {
                this.bindMembersDropdownEvents();
            }
        });
    }

    bindMembersDropdownEvents() {
        const dropdown = document.getElementById('members-dropdown');
        if (!dropdown) return;

        dropdown.querySelectorAll('.toggle-member').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const memberId = btn.dataset.memberId;
                const active = btn.dataset.active === 'true';
                try {
                    if (active) {
                        await api.delete(`/boards/${this.boardId}/columns/${this.columnId}/cards/${this.card.id}/members/${memberId}`);
                    } else {
                        await api.post(`/boards/${this.boardId}/columns/${this.columnId}/cards/${this.card.id}/members/${memberId}`);
                    }
                    await this.refreshMembers();
                } catch { /* ignore */ }
            });
        });
    }

    bindActionButtons() {
        document.getElementById('archive-card-btn')?.addEventListener('click', async () => {
            try {
                await api.patch(`/boards/${this.boardId}/columns/${this.columnId}/cards/${this.card.id}/archive`);
                this.close();
            } catch { /* ignore */ }
        });

        document.getElementById('delete-card-btn')?.addEventListener('click', async () => {
            if (!confirm('Delete this card? This cannot be undone.')) return;
            try {
                await api.delete(`/boards/${this.boardId}/columns/${this.columnId}/cards/${this.card.id}`);
                this.close();
            } catch { /* ignore */ }
        });
    }
}
