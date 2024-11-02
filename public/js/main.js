const authToken = localStorage.getItem('token');

if (authToken) {
  document.getElementById('auth-link').textContent = 'Logout';
  document.getElementById('auth-link').href = '#';
  document.getElementById('auth-link').onclick = () => {
    localStorage.removeItem('token');
    window.location.href = '/';
  };
  
  const registerLink = document.querySelector('a[href="/register"]');
  if (registerLink) {
    registerLink.style.display = 'none';
  }
}

// Redirect if on login or register page while logged in
if (authToken && (window.location.pathname === '/login' || window.location.pathname === '/register')) {
    window.location.href = '/';
} else if (!authToken && (window.location.pathname === '/' || window.location.pathname === '/profile')) {
    window.location.href = '/login';
}
