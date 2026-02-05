import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ssoAPI } from '../services/sso';
import '../App.css';

/**
 * Page de sélection de rôle pour utilisateurs SSO multi-rôles
 */
export default function RoleSelection() {
  const navigate = useNavigate();
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selecting, setSelecting] = useState(false);

  useEffect(() => {
    loadRoles();
  }, []);

  const loadRoles = async () => {
    try {
      setLoading(true);
      const data = await ssoAPI.getRoles();
      setRoles(data.roles || []);

      // Si pas de sélection requise, redirige vers dashboard
      if (!data.requiresSelection) {
        navigate('/');
      }
    } catch (err) {
      console.error('Failed to load roles:', err);
      setError(err.response?.data?.message || 'Échec du chargement des rôles');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectRole = async (roleName) => {
    try {
      setSelecting(true);
      setError(null);
      await ssoAPI.selectRole(roleName);
      navigate('/');
    } catch (err) {
      console.error('Failed to select role:', err);
      setError(err.response?.data?.message || 'Échec de la sélection du rôle');
    } finally {
      setSelecting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement des rôles...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sélection de rôle
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Vous avez accès à plusieurs rôles. Veuillez sélectionner le rôle avec lequel vous souhaitez
            vous connecter.
          </p>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Erreur</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mt-8 space-y-4">
          {roles.map((role) => (
            <button
              key={role.name}
              onClick={() => handleSelectRole(role.name)}
              disabled={selecting}
              className="w-full flex flex-col items-start p-6 border border-gray-300 rounded-lg hover:border-blue-500 hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-white"
            >
              <div className="flex items-center justify-between w-full">
                <h3 className="text-lg font-semibold text-gray-900">{role.displayName}</h3>
                <span className="text-xs font-medium text-blue-600 bg-blue-100 px-2 py-1 rounded">
                  {role.name}
                </span>
              </div>
              {role.description && (
                <p className="mt-2 text-sm text-gray-600 text-left">{role.description}</p>
              )}
            </button>
          ))}
        </div>

        <div className="text-center">
          <button
            onClick={() => (window.location.href = '/auth/sso/logout')}
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            Se déconnecter
          </button>
        </div>
      </div>
    </div>
  );
}
