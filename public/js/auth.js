class Auth {
  constructor() {
      this.baseUrl = '/api/auth';
      this.setupForms();
  }

  clearErrors() {
      const errorElements = document.querySelectorAll('.error-message');
      const inputElements = document.querySelectorAll('input');
      errorElements.forEach(el => el.textContent = '');
      inputElements.forEach(el => el.classList.remove('error'));
  }

  showError(fieldId, message) {
      const input = document.getElementById(fieldId);
      const errorElement = document.getElementById(`${fieldId}-error`);
      if (input && errorElement) {
          input.classList.add('error');
          errorElement.textContent = message;
      }
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
      this.clearErrors();
      
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
          
          if (!response.ok) {
              document.getElementById('password').classList.add('error');
              this.showError('password', 'Wrong username/password');
              return;
          }

          if (data.token) {
              localStorage.setItem('token', data.token);
              window.location.href = '/';
          }
      } catch (error) {
          this.showError('password', 'An error occurred. Please try again.');
      }
  }

  async handleRegister(e) {
      e.preventDefault();
      this.clearErrors();
      
      const username = document.getElementById('username').value;
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;

      if (!/^[a-zA-Z0-9._]+$/.test(username)) {
          this.showError('username', 'Username can only contain letters, numbers, dots and underscores');
          return;
      }

      try {
          const response = await fetch(`${this.baseUrl}/register`, {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json'
              },
              body: JSON.stringify({ username, email, password })
          });

          const data = await response.json();
          
          if (!response.ok) {
              if (data.error.includes('Username already exists')) {
                  this.showError('username', 'This username is taken');
              } else {
                  this.showError('username', data.error);
              }
              return;
          }

          if (data.token) {
              localStorage.setItem('token', data.token);
              window.location.href = '/';
          }
      } catch (error) {
          this.showError('username', 'An error occurred. Please try again.');
      }
  }
}

const auth = new Auth();

function setupPasswordToggles() {
    const passwordToggles = document.querySelectorAll('.password-toggle');
    
    passwordToggles.forEach(toggle => {
        toggle.addEventListener('click', function() {
            const input = this.parentElement.querySelector('input');
            const icon = this.querySelector('.eye-icon');
            
            if (input.type === 'password') {
                input.type = 'text';
                icon.src = '/img/eye-off.svg';
            } else {
                input.type = 'password';
                icon.src = '/img/eye.svg';
            }
        });
    });
}

document.addEventListener('DOMContentLoaded', setupPasswordToggles);