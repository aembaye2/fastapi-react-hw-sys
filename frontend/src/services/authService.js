import api from './api.js';

class AuthService {
  // Login user
  async login(email, password) {
    try {
      const response = await api.post('/auth/login', {
        email,
        password,
      });

      const { access_token, refresh_token, user } = response.data;

      // Store tokens in localStorage
      localStorage.setItem('access_token', access_token);
      localStorage.setItem('refresh_token', refresh_token);
      localStorage.setItem('user', JSON.stringify(user));

      return { success: true, user, access_token };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.detail || 'Login failed'
      };
    }
  }

  // Register new user
  async register(userData) {
    try {
      console.log('Attempting registration with:', userData);
      console.log('API Base URL:', api.defaults.baseURL);

      const response = await api.post('/auth/register', userData);
      console.log('Registration successful:', response.data);

      return { success: true, data: response.data };
    } catch (error) {
      console.error('Registration error:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);

      // Check if it's a network error
      if (!error.response) {
        return {
          success: false,
          error: 'Cannot connect to server. Please check if the backend is running on http://127.0.0.1:8000'
        };
      }

      return {
        success: false,
        error: error.response?.data?.detail || error.response?.data?.message || 'Registration failed'
      };
    }
  }

  // Logout user
  async logout() {
    try {
      const token = localStorage.getItem('access_token');
      if (token) {
        // Call backend logout endpoint to blacklist token
        await api.post('/auth/logout');
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear local storage regardless of API call success
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
    }
  }

  // Get current user from localStorage
  getCurrentUser() {
    try {
      const user = localStorage.getItem('user');
      return user ? JSON.parse(user) : null;
    } catch (error) {
      return null;
    }
  }

  // Check if user is authenticated
  isAuthenticated() {
    const token = localStorage.getItem('access_token');
    const user = this.getCurrentUser();
    return !!(token && user);
  }

  // Get access token
  getAccessToken() {
    return localStorage.getItem('access_token');
  }

  // Refresh access token
  async refreshToken() {
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await api.post('/auth/refresh', {
        refresh_token: refreshToken
      });

      const { access_token } = response.data;
      localStorage.setItem('access_token', access_token);

      return access_token;
    } catch (error) {
      // If refresh fails, logout user
      this.logout();
      throw error;
    }
  }

  // Verify token with backend
  async verifyToken() {
    try {
      const response = await api.get('/auth/me');
      return { success: true, user: response.data };
    } catch (error) {
      return { success: false, error: error.response?.data?.detail };
    }
  }

  // Test backend connection
  async testConnection() {
    try {
      const response = await api.get('/');
      console.log('Backend connection test successful:', response.data);
      return { success: true, message: 'Backend is reachable' };
    } catch (error) {
      console.error('Backend connection test failed:', error);
      return {
        success: false,
        error: 'Cannot connect to backend server'
      };
    }
  }
}

export default new AuthService();
