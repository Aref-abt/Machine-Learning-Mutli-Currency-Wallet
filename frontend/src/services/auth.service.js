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
      }

      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Error during login' };
    }
  }

  static async register(email, password) {
    try {
      const response = await api.post(`${API_URL}/register`, {
        email,
        password
      });

      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }

      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Error during registration' };
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
