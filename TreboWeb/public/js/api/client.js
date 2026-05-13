export const API_BASE = 'http://192.168.1.227:5214';

export function getUser() {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
}

function getAccessToken() {
    return localStorage.getItem('accessToken');
}

export function saveSession(data) {
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    if (data.id) {
        localStorage.setItem('user', JSON.stringify({
            id: data.id,
            username: data.username,
            email: data.email
        }));
    }
}

export function clearSession() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
}

async function tryRefresh() {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) return false;

    try {
        const res = await fetch(`${API_BASE}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken })
        });
        if (!res.ok) { clearSession(); return false; }
        const data = await res.json();
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
        return true;
    } catch {
        clearSession();
        return false;
    }
}

async function request(method, path, body) {
    const token = getAccessToken();

    const buildOpts = (t) => ({
        method,
        headers: {
            'Content-Type': 'application/json',
            ...(t ? { Authorization: `Bearer ${t}` } : {})
        },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {})
    });

    let res = await fetch(`${API_BASE}${path}`, buildOpts(token));

    if (res.status === 401) {
        const ok = await tryRefresh();
        if (ok) {
            res = await fetch(`${API_BASE}${path}`, buildOpts(getAccessToken()));
        } else {
            window.location.href = '/login';
            throw new Error('Session expired');
        }
    }

    if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(text || `HTTP ${res.status}`);
    }

    const ct = res.headers.get('content-type') || '';
    if (ct.includes('application/json')) return res.json();
    return null;
}

export const api = {
    get: (path) => request('GET', path),
    post: (path, body) => request('POST', path, body),
    put: (path, body) => request('PUT', path, body),
    patch: (path, body) => request('PATCH', path, body),
    delete: (path) => request('DELETE', path)
};
