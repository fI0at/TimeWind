class Auth {
  constructor() {
    this.baseUrl = '/api/auth';
    this.setupForm();
    this.validEmailDomains = [
      '@gmail.com',
      '@yahoo.com',
      '@hotmail.com',
      '@outlook.com',
      '@aol.com',
      '@icloud.com',
      '@protonmail.com',
      '@zoho.com',
      '@mail.com',
      '@gmx.com',
      '@yandex.com',
      '@live.com',
      '@inbox.com',
      '@fastmail.com',
      '@me.com',
      '@msn.com',
      '@proton.me',
      '@timewind.local', // Keep this for testing/development
      '@pm.me',
      '@tutanota.com'
    ];
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

  isValidEmailDomain(email) {
    return this.validEmailDomains.some(domain => 
      email.toLowerCase().endsWith(domain.toLowerCase())
    );
  }

  setupForm() {
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
      registerForm.addEventListener('submit', (e) => this.handleRegister(e));
    }
  }

  async handleRegister(e) {
    e.preventDefault();
    this.clearErrors();
    
    const username = document.getElementById('username').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    if (username.length < 3 || username.length > 16) {
      this.showError('username', 'Username must be between 3 and 16 characters');
      return;
    }

    if (!/^[a-zA-Z0-9._]+$/.test(username)) {
      this.showError('username', 'Username can only contain letters, numbers, dots and underscores');
      return;
    }

    if (username.toLowerCase() === 'null') {
      this.showError('username', 'This username is not allowed');
      return;
    }

    if (!this.isValidEmailDomain(email)) {
      this.showError('email', 'Please use a valid email provider');
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
        } else if (data.error.includes('Email already exists')) {
          this.showError('email', 'This email is already registered');
        } else if (data.error.includes('username')) {
          this.showError('username', data.error);
        } else if (data.error.includes('email')) {
          this.showError('email', data.error);
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