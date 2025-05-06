import AuthService from './services/AuthService.js';

class AuthUI {
    constructor() {
        this.loginForm = document.getElementById('loginForm');
        this.registerForm = document.getElementById('registerForm');
        this.loginFormElement = document.getElementById('loginFormElement');
        this.registerFormElement = document.getElementById('registerFormElement');
        this.showRegisterBtn = document.getElementById('showRegister');
        this.showLoginBtn = document.getElementById('showLogin');

        this.initializeEventListeners();
    }

    initializeEventListeners() {
        this.showRegisterBtn.addEventListener('click', () => {
            this.loginForm.classList.add('hidden');
            this.registerForm.classList.remove('hidden');
        });

        this.showLoginBtn.addEventListener('click', () => {
            this.registerForm.classList.add('hidden');
            this.loginForm.classList.remove('hidden');
        });

        this.loginFormElement.addEventListener('submit', this.handleLogin.bind(this));
        this.registerFormElement.addEventListener('submit', this.handleRegister.bind(this));
    }

    async handleLogin(e) {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        try {
            await AuthService.login(email, password);
            window.location.href = 'list.html';
        } catch (error) {
            alert(error.message);
        }
    }

    async handleRegister(e) {
        e.preventDefault();
        const name = document.getElementById('registerName').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;

        try {
            await AuthService.register(name, email, password);
            window.location.href = 'list.html';
        } catch (error) {
            alert(error.message);
        }
    }
}

// Initialize the Auth UI when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new AuthUI();
});