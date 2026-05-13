import { api, saveSession } from '../api/client.js';

const form = document.getElementById('register-form');
const errorMsg = document.getElementById('error-msg');
const submitBtn = document.getElementById('submit-btn');

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorMsg.classList.add('hidden');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating account...';

    const username = document.getElementById('username').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    try {
        await api.post('/auth/register', { username, email, password });
        const data = await api.post('/auth/login', { email, password });
        saveSession(data);
        window.location.href = '/boards';
    } catch (err) {
        const msg = err.message.includes('already') ? 'Email or username is already taken.' : 'Registration failed. Please try again.';
        errorMsg.textContent = msg;
        errorMsg.classList.remove('hidden');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Create Account';
    }
});
