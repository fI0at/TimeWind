const authToken = localStorage.getItem('token');
const navLinks = document.getElementById('nav-links');
const homeLink = navLinks.querySelector('a[href="/"]');
const profileLink = navLinks.querySelector('a[href="/profile"]');
const adminLink = navLinks.querySelector('a[href="/admin"]');

adminLink.style.display = 'none';

async function validateToken() {
  if (!authToken) return false;
  
  try {
    const response = await fetch('/api/users/profile/me', {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    if (!response.ok) {
      return false;
    }
    return true;
  } catch (error) {
    return false;
  }
}

if (authToken) {
  validateToken().then(async isValid => {
    if (isValid) {
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

      const response = await fetch('/api/users/profile/me', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      const profile = await response.json();

      if (profile.badge && profile.badge.toLowerCase() === 'administrator') {
        adminLink.style.display = 'inline';
      }
    } else if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
  });
} else {
  if (homeLink) homeLink.style.display = 'none';
  if (profileLink) profileLink.style.display = 'none';
}

if (authToken && (window.location.pathname === '/login' || window.location.pathname === '/register')) {
  window.location.href = '/';
} else if (!authToken && (window.location.pathname === '/' || window.location.pathname === '/profile')) {
  window.location.href = '/login';
}
