import axios from 'axios';

const isLocalDev = typeof window !== 'undefined' && window.location.port === '5173';
const NODE_API_URL = import.meta.env.VITE_NODE_API_URL || (isLocalDev ? 'http://localhost:5000' : '/api/node');
const PYTHON_API_URL = import.meta.env.VITE_PYTHON_API_URL || (isLocalDev ? 'http://localhost:8000' : '/api/py');

// Axios instance for Node.js backend (Auth, Profiles, MySQL)
export const nodeApi = axios.create({
  baseURL: NODE_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach JWT token
nodeApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle token expiry / unauthorized access
nodeApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      localStorage.removeItem('token');
      localStorage.removeItem('email');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/' && window.location.pathname !== '/signup') {
        window.location.href = '/';
      }
    }
    return Promise.reject(error);
  }
);

// Axios instance for Python FastAPI backend (Groq AI, RAG, File uploads)
export const pythonApi = axios.create({
  baseURL: PYTHON_API_URL,
});

pythonApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Authentication Helpers
export const authService = {
  getToken: () => localStorage.getItem('token'),
  getEmail: () => localStorage.getItem('email'),
  getUser: () => {
    try {
      const u = localStorage.getItem('user');
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  },
  isAuthenticated: () => {
    const token = localStorage.getItem('token');
    return !!token;
  },
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('email');
    localStorage.removeItem('user');
  },
  setSession: (token, email, user) => {
    localStorage.setItem('token', token);
    localStorage.setItem('email', email);
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    }
  },
};
