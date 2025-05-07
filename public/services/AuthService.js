class AuthService {
    constructor() {
        this.API_URL = 'http://localhost:3000';
    }

    async checkAuthStatus() {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        try {
            const response = await fetch(`${this.API_URL}/auth/me`, {
                headers: {
                    'Authorization': token ? `Bearer ${token}` : ''
                }
            });

            const data = await response.json();
            if (data.user) {
                // Store user data in session storage
                sessionStorage.setItem('user', JSON.stringify(data.user));
                return {
                    isAuthenticated: true,
                    user: {
                        _id: data.user._id,
                        name: data.user.name,
                        email: data.user.email
                    }
                };
            } else {
                sessionStorage.removeItem('user');
                return { isAuthenticated: false };
            }
        } catch (error) {
            console.error('Auth check error:', error);
            sessionStorage.removeItem('user');
            return { isAuthenticated: false };
        }
    }

    updateUIForAuthStatus(data) {
        const userIconContainer = document.getElementById('userIconContainer');
        const loginLink = document.getElementById('loginLink');
        const userDisplayName = document.getElementById('userDisplayName');
        
        if (data.isAuthenticated) {
            userIconContainer.classList.remove('hidden');
            loginLink.classList.add('hidden');
            userDisplayName.textContent = data.user.name || data.user.email || 'User';
        } else {
            userIconContainer.classList.add('hidden');
            loginLink.classList.remove('hidden');
        }
    }

    async requireAuth() {
        const data = await this.checkAuthStatus();
        if (!data.isAuthenticated) {
            window.location.href = '/auth.html';
            return false;
        }
        return true;
    }

    async logout() {
        try {
            const token = localStorage.getItem('token') || sessionStorage.getItem('token');
            
            // Call the server logout endpoint
            await fetch(`${this.API_URL}/auth/logout`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
        } catch (error) {
            console.error('Logout request failed:', error);
        } finally {
            // Clean up storage
            localStorage.removeItem('token');
            sessionStorage.removeItem('token');
            sessionStorage.removeItem('user');
            
            // Redirect to home page
            window.location.href = '/index.html';
        }
    }
}

export const authService = new AuthService();
export default AuthService;