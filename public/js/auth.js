// Authentication Management
class Auth {
    constructor() {
        this.token = localStorage.getItem('token');
        this.user = this.getUser();
        this.isGuestMode = !this.isLoggedIn();
    }

    getUser() {
        const userStr = localStorage.getItem('user');
        return userStr ? JSON.parse(userStr) : null;
    }

    isLoggedIn() {
        return !!this.token && !!this.user;
    }

    isGuest() {
        return !this.isLoggedIn();
    }

    isAdmin() {
        return this.isLoggedIn() && this.user.role === 'admin';
    }

    async login(email, password) {
        try {
            const data = await api.auth.login({ email, password });
            
            this.token = data.token;
            this.user = data.user;
            this.isGuestMode = false;
            
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            
            // Clear guest cart when logging in
            localStorage.removeItem('cart_guest');
            
            this.updateUI();
            
            // Trigger auth state change event
            window.dispatchEvent(new CustomEvent('authStateChanged', { detail: { user: data.user } }));
            
            return { success: true, user: data.user };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async register(userData) {
        try {
            const data = await api.auth.register(userData);
            
            this.token = data.token;
            this.user = data.user;
            this.isGuestMode = false;
            
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            
            // Clear guest cart when registering
            localStorage.removeItem('cart_guest');
            
            this.updateUI();
            
            // Trigger auth state change event
            window.dispatchEvent(new CustomEvent('authStateChanged', { detail: { user: data.user } }));
            
            return { success: true, user: data.user };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    logout() {
        // Store user ID before clearing
        const userId = this.user?._id;
        
        this.token = null;
        this.user = null;
        this.isGuestMode = true;
        
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        // Clear user-specific cart - cart stays in storage but won't be accessible without login
        // Do NOT remove the cart so user can see it when they log back in
        // if (userId) {
        //     localStorage.removeItem(`cart_${userId}`);
        // }
        
        // Clear any guest cart
        localStorage.removeItem('cart_guest');
        localStorage.removeItem('cart');
        
        // Trigger auth state change event BEFORE redirect
        window.dispatchEvent(new CustomEvent('authStateChanged', { detail: { user: null } }));
        
        // Update UI
        this.updateUI();
        
        // Show notification
        if (typeof toast !== 'undefined') {
            toast.success('You have been logged out successfully');
        }
        
        // Redirect to home after a short delay
        setTimeout(() => {
            window.location.href = '/';
        }, 500);
    }

    requireAuth(message = 'Please login to continue') {
        if (!this.isLoggedIn()) {
            if (typeof toast !== 'undefined') {
                toast.warning(message, 'Authentication Required');
            }
            setTimeout(() => {
                window.location.href = '/login.html?redirect=' + encodeURIComponent(window.location.pathname);
            }, 1000);
            return false;
        }
        return true;
    }

    requireUser(message = 'This feature is only available to registered users') {
        if (this.isGuest()) {
            if (typeof toast !== 'undefined') {
                toast.warning(message, 'Login Required');
            }
            return false;
        }
        return true;
    }

    requireAdmin() {
        if (!this.isAdmin()) {
            if (typeof toast !== 'undefined') {
                toast.error('You do not have permission to access this page', 'Access Denied');
            }
            setTimeout(() => {
                window.location.href = '/';
            }, 1500);
            return false;
        }
        return true;
    }

    updateUI() {
        const authActions = document.querySelector('.auth-actions');
        const userMenu = document.querySelector('.user-menu');
        const adminLink = document.querySelector('.admin-only');

        if (!authActions || !userMenu) return;

        if (this.isLoggedIn()) {
            // Hide login/register buttons
            authActions.style.display = 'none';
            userMenu.style.display = 'flex';

            // Update user name
            const userName = userMenu.querySelector('.user-name');
            if (userName) {
                userName.textContent = this.user.name;
            }

            // Show admin link if user is admin
            if (adminLink) {
                if (this.isAdmin()) {
                    adminLink.style.display = 'flex';
                    adminLink.href = '/admin.html';
                } else {
                    adminLink.style.display = 'none';
                }
            }
        } else {
            // Show login/register buttons
            authActions.style.display = 'flex';
            userMenu.style.display = 'none';
        }
    }
}

// Initialize auth
const auth = new Auth();

// Initialize UI when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    auth.updateUI();

    // Logout button handler
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            auth.logout();
        });
    }
});

