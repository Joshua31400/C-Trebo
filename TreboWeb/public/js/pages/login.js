import { api, saveSession, getUser } from '../api/client.js';

if (getUser()) window.location.href = '/boards';

const form = document.getElementById('login-form');
const errorMsg = document.getElementById('error-msg');
const submitBtn = document.getElementById('submit-btn');

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorMsg.classList.add('hidden');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Signing in...';

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    try {
        const data = await api.post('/auth/login', { email, password });
        saveSession(data);
        window.location.href = '/boards';
    } catch {
        errorMsg.textContent = 'Invalid email or password.';
        errorMsg.classList.remove('hidden');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Sign In';
    }
});
