import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { applicationsAPI, environmentsAPI } from '../services/api';
import {
  Plus,
  Search,
  Boxes,
  Activity,
  Edit,
  Trash2,
  Server,
  Globe,
} from 'lucide-react';
import Modal from '../components/Modal';
import Button from '../components/Button';
import Badge from '../components/Badge';

export default function Applications() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedApp, setSelectedApp] = useState(null);

  useEffect(() => {
    loadApplications();
  }, []);

  const loadApplications = async () => {
    try {
      const { data } = await applicationsAPI.list();
      setApplications(data.data || []);
    } catch (error) {
      console.error('Failed to load applications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      await applicationsAPI.delete(selectedApp.id);
      await loadApplications();
      setShowDeleteModal(false);
      setSelectedApp(null);
    } catch (error) {
      console.error('Failed to delete application:', error);
    }
  };

  const filteredApps = applications.filter((app) =>
    app.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getTypeBadge = (type) => {
    const variants = {
      API: 'info',
      WEB: 'purple',
      HYBRID: 'default',
    };
    return <Badge variant={variants[type] || 'default'}>{type}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Applications</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your applications and environments
          </p>
        </div>
        <Button icon={Plus} onClick={() => setShowCreateModal(true)}>
          New Application
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search applications..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Applications Grid */}
      {filteredApps.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <Boxes className="h-12 w-12 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No applications found
          </h3>
          <p className="text-gray-500 mb-4">
            Get started by creating your first application
          </p>
          <Button icon={Plus} onClick={() => setShowCreateModal(true)}>
            Create Application
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredApps.map((app) => (
            <ApplicationCard
              key={app.id}
              app={app}
              onDelete={() => {
                setSelectedApp(app);
                setShowDeleteModal(true);
              }}
            />
          ))}
        </div>
      )}

      {/* Create Modal */}
      <CreateApplicationModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          setShowCreateModal(false);
          loadApplications();
        }}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Application"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Are you sure you want to delete <strong>{selectedApp?.name}</strong>?
            This action cannot be undone.
          </p>
          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={() => setShowDeleteModal(false)}
            >
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete}>
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function ApplicationCard({ app, onDelete }) {
  const [health, setHealth] = useState(null);
  const [loadingHealth, setLoadingHealth] = useState(false);

  const loadHealth = async () => {
    setLoadingHealth(true);
    try {
      const { data } = await applicationsAPI.getHealth(app.id);
      setHealth(data);
    } catch (error) {
      console.error('Failed to load health:', error);
    } finally {
      setLoadingHealth(false);
    }
  };

  const getHealthBadge = (status) => {
    const variants = {
      healthy: 'success',
      degraded: 'warning',
      unhealthy: 'error',
      unknown: 'default',
    };
    return <Badge variant={variants[status]}>{status}</Badge>;
  };

  return (
    <div className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Boxes className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{app.name}</h3>
              {app.type && <div className="mt-1">{getTypeBadge(app.type)}</div>}
            </div>
          </div>
          <div className="flex space-x-2">
            <Link to={`/applications/${app.id}`}>
              <button className="text-gray-400 hover:text-blue-600">
                <Edit className="h-4 w-4" />
              </button>
            </Link>
            <button
              onClick={onDelete}
              className="text-gray-400 hover:text-red-600"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Description */}
        {app.description && (
          <p className="text-sm text-gray-600 mb-4">{app.description}</p>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-xs text-gray-500">Environments</p>
            <p className="text-lg font-semibold text-gray-900">
              {app.environmentCount || 0}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Test Suites</p>
            <p className="text-lg font-semibold text-gray-900">
              {app.testCount || 0}
            </p>
          </div>
        </div>

        {/* Health Status */}
        <div className="border-t pt-4">
          {!health && !loadingHealth && (
            <Button
              variant="ghost"
              size="sm"
              icon={Activity}
              onClick={loadHealth}
              className="w-full"
            >
              Check Health
            </Button>
          )}
          {loadingHealth && (
            <div className="text-center text-sm text-gray-500">
              Loading health...
            </div>
          )}
          {health && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Overall Status</span>
                {getHealthBadge(health.overallStatus)}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CreateApplicationModal({ isOpen, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'API',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await applicationsAPI.create(formData);
      setFormData({ name: '', description: '', type: 'API' });
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create application');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Application">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Name *
          </label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="My Application"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Type *
          </label>
          <select
            required
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="API">API</option>
            <option value="WEB">WEB</option>
            <option value="HYBRID">HYBRID</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Optional description..."
          />
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Creating...' : 'Create Application'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
