import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api/v1', '') || 'http://localhost:3000';

// Create axios instance for SSO endpoints (no /api/v1 prefix)
const ssoApi = axios.create({
  baseURL: API_BASE,
  withCredentials: true, // Important: envoie les cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Service SSO pour authentification JumpCloud
 */
export const ssoAPI = {
  /**
   * Redirige vers la page de login SSO JumpCloud
   */
  login: () => {
    window.location.href = `${API_BASE}/auth/sso/login`;
  },

  /**
   * Récupère la session SSO courante
   */
  getSession: async () => {
    try {
      const { data } = await ssoApi.get('/auth/sso/session');
      return data;
    } catch (error) {
      if (error.response?.status === 401) {
        return null;
      }
      throw error;
    }
  },

  /**
   * Sélectionne un rôle (pour utilisateurs multi-rôles)
   */
  selectRole: async (role) => {
    const { data } = await ssoApi.post('/auth/sso/role', { role });
    return data;
  },

  /**
   * Liste les rôles disponibles
   */
  getRoles: async () => {
    const { data } = await ssoApi.get('/auth/sso/roles');
    return data;
  },

  /**
   * Déconnexion SSO
   */
  logout: () => {
    window.location.href = `${API_BASE}/auth/sso/logout`;
  },
};

/**
 * Hook pour vérifier si SSO est activé
 */
export const isSsoEnabled = () => {
  return import.meta.env.VITE_SSO_ENABLED === 'true';
};

export default ssoAPI;
