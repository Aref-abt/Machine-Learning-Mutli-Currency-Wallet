import api from '../api';

const API_URL = '/auth';

export class AuthService {
  static async login(email, password) {
    try {
      const response = await api.post(`${API_URL}/login`, {
        email,
        password
      });

      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        // Force reload of app state after login
        window.location.href = '/wallet';
      }

      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Error during login' };
    }
  }

  static async register({ username, email, password }) {
    try {
      // Validate input before making the request
      if (!username || !email || !password) {
        throw { message: 'All fields are required' };
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw { message: 'Invalid email format' };
      }

      // Validate password
      if (password.length < 8) {
        throw { message: 'Password must be at least 8 characters long' };
      }
      if (!/[A-Z]/.test(password)) {
        throw { message: 'Password must contain at least one uppercase letter' };
      }
      if (!/[0-9]/.test(password)) {
        throw { message: 'Password must contain at least one number' };
      }

      const response = await api.post(`${API_URL}/register`, {
        username,
        email,
        password
      });

      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        // Force reload of app state after registration
        window.location.href = '/wallet';
      }

      return response.data;
    } catch (error) {
      if (error.response?.data?.message) {
        throw { message: error.response.data.message };
      } else if (error.message) {
        throw { message: error.message };
      } else {
        throw { message: 'Error during registration' };
      }
    }
  }

  static logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }

  static async updateProfile(formData) {
    try {
      const response = await api.post(`${API_URL}/profile`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.user) {
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }

      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Error updating profile' };
    }
  }

  static getCurrentUser() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }

  static isLoggedIn() {
    return !!localStorage.getItem('token');
  }
}
