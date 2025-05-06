class AuthService {
    constructor() {
        this.API_URL = 'http://localhost:3000';
    }

    async login(email, password) {
        try {
            const response = await fetch(`${this.API_URL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();
            if (response.ok) {
                localStorage.setItem('token', data.token);
                sessionStorage.setItem('user', JSON.stringify(data.user));
                return data;
            } else {
                throw new Error(data.error || 'Login failed');
            }
        } catch (error) {
            throw new Error('Login failed. Please try again.');
        }
    }

    async register(name, email, password) {
        try {
            const response = await fetch(`${this.API_URL}/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name, email, password })
            });

            const data = await response.json();
            if (response.ok) {
                localStorage.setItem('token', data.token);
                sessionStorage.setItem('user', JSON.stringify(data.user));
                return data;
            } else {
                throw new Error(data.error + (data.details ? `\nDetails: ${data.details}` : ''));
            }
        } catch (error) {
            throw new Error('Registration failed. Please check your connection and try again.');
        }
    }

    async logout() {
        try {
            await fetch(`${this.API_URL}/auth/logout`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token') || sessionStorage.getItem('token')}`
                }
            });
        } catch (error) {
            console.error('Logout request failed:', error);
        } finally {
            localStorage.removeItem('token');
            sessionStorage.removeItem('token');
            sessionStorage.removeItem('user');
        }
    }
}

export default new AuthService();