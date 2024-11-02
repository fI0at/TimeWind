class Auth {
  constructor() {
      this.baseUrl = '/api/auth';
      this.setupForms();
  }

  setupForms() {
      const loginForm = document.getElementById('login-form');
      const registerForm = document.getElementById('register-form');

      if (loginForm) {
          loginForm.addEventListener('submit', (e) => this.handleLogin(e));
      }
      if (registerForm) {
          registerForm.addEventListener('submit', (e) => this.handleRegister(e));
      }
  }

  async handleLogin(e) {
      e.preventDefault();
      const username = document.getElementById('username').value;
      const password = document.getElementById('password').value;

      try {
          const response = await fetch(`${this.baseUrl}/login`, {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json'
              },
              body: JSON.stringify({ username, password })
          });

          const data = await response.json();
          if (data.token) {
              localStorage.setItem('token', data.token);
              window.location.href = '/';
          }
      } catch (error) {
          console.error('Login error:', error);
      }
  }

  async handleRegister(e) {
      e.preventDefault();
      const username = document.getElementById('username').value;
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;

      try {
          const response = await fetch(`${this.baseUrl}/register`, {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json'
              },
              body: JSON.stringify({ username, email, password })
          });

          const data = await response.json();
          if (data.token) {
              localStorage.setItem('token', data.token);
              window.location.href = '/';
          }
      } catch (error) {
          console.error('Registration error:', error);
      }
  }
}

const auth = new Auth();