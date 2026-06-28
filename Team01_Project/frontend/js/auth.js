// Redirect authenticated users away from auth pages
if (localStorage.getItem('token')) {
  window.location.href = 'dashboard.html';
}

const isRegister = document.getElementById('register-form') !== null;
const form = document.getElementById(isRegister ? 'register-form' : 'login-form');
const errorMsg = document.getElementById('error-msg');

function showError(msg) {
  errorMsg.textContent = msg;
  errorMsg.classList.remove('hidden');
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorMsg.classList.add('hidden');

  const email    = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  try {
    let result;
    if (isRegister) {
      const username = document.getElementById('username').value.trim();
      result = await api.auth.register({ username, email, password });
    } else {
      result = await api.auth.login({ email, password });
    }

    localStorage.setItem('token',    result.token);
    localStorage.setItem('username', result.username);
    localStorage.setItem('userId',   result.userId);

    window.location.href = 'dashboard.html';
  } catch (err) {
    showError(err.message);
  }
});
