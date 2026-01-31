import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and not already retried
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          const { data } = await axios.post(`${API_URL}/auth/refresh`, {
            refreshToken,
          });

          localStorage.setItem('accessToken', data.accessToken);
          localStorage.setItem('refreshToken', data.refreshToken);

          originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
          return api(originalRequest);
        } catch (refreshError) {
          // Refresh failed, logout
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      }
    }

    return Promise.reject(error);
  }
);

// ============== AUTH ==============

export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (email, password, name) => api.post('/auth/register', { email, password, name }),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  refresh: (refreshToken) => api.post('/auth/refresh', { refreshToken }),
};

// ============== APPLICATIONS ==============

export const applicationsAPI = {
  list: () => api.get('/applications'),
  get: (id) => api.get(`/applications/${id}`),
  create: (data) => api.post('/applications', data),
  update: (id, data) => api.put(`/applications/${id}`, data),
  delete: (id) => api.delete(`/applications/${id}`),
  getHealth: (id) => api.get(`/applications/${id}/health`),
};

// ============== ENVIRONMENTS ==============

export const environmentsAPI = {
  create: (applicationId, data) =>
    api.post(`/applications/${applicationId}/environments`, data),
  update: (id, data) => api.put(`/environments/${id}`, data),
  delete: (id) => api.delete(`/environments/${id}`),
};

// ============== TESTS ==============

export const testsAPI = {
  list: (params) => api.get('/tests', { params }),
  get: (id) => api.get(`/tests/${id}`),
  create: (data) => api.post('/tests', data),
  update: (id, data) => api.put(`/tests/${id}`, data),
  delete: (id) => api.delete(`/tests/${id}`),
  duplicate: (id) => api.post(`/tests/${id}/duplicate`),
  export: (id) => api.get(`/tests/${id}/export`),
  import: (data) => api.post('/tests/import', data),
  execute: (id, data) => api.post(`/tests/${id}/execute`, data),
};

// ============== TEST STEPS ==============

export const testStepsAPI = {
  create: (testSuiteId, data) =>
    api.post(`/tests/${testSuiteId}/steps`, data),
  update: (id, data) => api.put(`/steps/${id}`, data),
  delete: (id) => api.delete(`/steps/${id}`),
  reorder: (testSuiteId, stepIds) =>
    api.put(`/tests/${testSuiteId}/steps/reorder`, { stepIds }),
};

// ============== EXECUTIONS ==============

export const executionsAPI = {
  get: (id) => api.get(`/executions/${id}`),
  list: (params) => api.get('/executions', { params }),
};

// ============== CREDENTIALS ==============

export const credentialsAPI = {
  list: (params) => api.get('/credentials', { params }),
  get: (id) => api.get(`/credentials/${id}`),
  create: (data) => api.post('/credentials', data),
  update: (id, data) => api.put(`/credentials/${id}`, data),
  delete: (id) => api.delete(`/credentials/${id}`),
  test: (id, testUrl) => api.post(`/credentials/${id}/test`, { testUrl }),
  decrypt: (id) => api.get(`/credentials/${id}/decrypt`),
  rotate: (id, data) => api.post(`/credentials/${id}/rotate`, { data }),
};

export default api;
