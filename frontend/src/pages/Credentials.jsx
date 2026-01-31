import { useEffect, useState } from 'react';
import { credentialsAPI, applicationsAPI } from '../services/api';
import {
  Key,
  Search,
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Copy,
  CheckCircle,
} from 'lucide-react';
import Modal from '../components/Modal';
import Button from '../components/Button';
import Badge from '../components/Badge';

export default function Credentials() {
  const [credentials, setCredentials] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterApp, setFilterApp] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedCredential, setSelectedCredential] = useState(null);
  const [revealedPasswords, setRevealedPasswords] = useState({});
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    loadData();
  }, [filterApp]);

  const loadData = async () => {
    try {
      const [credsRes, appsRes] = await Promise.all([
        credentialsAPI.list({ applicationId: filterApp }),
        applicationsAPI.list(),
      ]);
      setCredentials(credsRes.data.data || []);
      setApplications(appsRes.data.data || []);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      await credentialsAPI.delete(selectedCredential.id);
      await loadData();
      setShowDeleteModal(false);
      setSelectedCredential(null);
    } catch (error) {
      console.error('Failed to delete credential:', error);
    }
  };

  const togglePasswordVisibility = async (credentialId) => {
    if (revealedPasswords[credentialId]) {
      setRevealedPasswords((prev) => ({ ...prev, [credentialId]: null }));
    } else {
      try {
        const { data } = await credentialsAPI.decrypt(credentialId);
        setRevealedPasswords((prev) => ({
          ...prev,
          [credentialId]: data.decryptedValue,
        }));
      } catch (error) {
        console.error('Failed to decrypt credential:', error);
      }
    }
  };

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredCredentials = credentials.filter((cred) =>
    cred.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getTypeBadge = (type) => {
    const variants = {
      API_KEY: 'info',
      PASSWORD: 'purple',
      TOKEN: 'success',
      SECRET: 'warning',
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
          <h1 className="text-2xl font-bold text-gray-900">Credentials</h1>
          <p className="mt-1 text-sm text-gray-500">
            Securely manage API keys, passwords, and tokens
          </p>
        </div>
        <Button icon={Plus} onClick={() => setShowCreateModal(true)}>
          New Credential
        </Button>
      </div>

      {/* Filters & Search */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search credentials..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <select
          value={filterApp}
          onChange={(e) => setFilterApp(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Applications</option>
          {applications.map((app) => (
            <option key={app.id} value={app.id}>
              {app.name}
            </option>
          ))}
        </select>
      </div>

      {/* Credentials List */}
      {filteredCredentials.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <Key className="h-12 w-12 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No credentials found
          </h3>
          <p className="text-gray-500 mb-4">
            Create a credential to securely store API keys and passwords
          </p>
          <Button icon={Plus} onClick={() => setShowCreateModal(true)}>
            Create Credential
          </Button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Application
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Value
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredCredentials.map((cred) => (
                <tr key={cred.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <Key className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {cred.name}
                        </div>
                        {cred.description && (
                          <div className="text-sm text-gray-500">
                            {cred.description}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {cred.application?.name || 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getTypeBadge(cred.type)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-mono text-gray-900">
                        {revealedPasswords[cred.id] || '••••••••'}
                      </span>
                      <button
                        onClick={() => togglePasswordVisibility(cred.id)}
                        className="text-gray-400 hover:text-blue-600"
                        title={
                          revealedPasswords[cred.id] ? 'Hide' : 'Reveal'
                        }
                      >
                        {revealedPasswords[cred.id] ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                      {revealedPasswords[cred.id] && (
                        <button
                          onClick={() =>
                            handleCopy(revealedPasswords[cred.id], cred.id)
                          }
                          className="text-gray-400 hover:text-blue-600"
                          title="Copy to clipboard"
                        >
                          {copiedId === cred.id ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => {
                          setSelectedCredential(cred);
                          setShowEditModal(true);
                        }}
                        className="text-gray-400 hover:text-blue-600"
                        title="Edit"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedCredential(cred);
                          setShowDeleteModal(true);
                        }}
                        className="text-gray-400 hover:text-red-600"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Modal */}
      <CreateCredentialModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          setShowCreateModal(false);
          loadData();
        }}
        applications={applications}
      />

      {/* Edit Modal */}
      {selectedCredential && (
        <EditCredentialModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedCredential(null);
          }}
          onSuccess={() => {
            setShowEditModal(false);
            setSelectedCredential(null);
            loadData();
          }}
          credential={selectedCredential}
          applications={applications}
        />
      )}

      {/* Delete Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Credential"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Are you sure you want to delete{' '}
            <strong>{selectedCredential?.name}</strong>? This action cannot be
            undone.
          </p>
          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
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

function CreateCredentialModal({ isOpen, onClose, onSuccess, applications }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'API_KEY',
    value: '',
    applicationId: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await credentialsAPI.create(formData);
      setFormData({
        name: '',
        description: '',
        type: 'API_KEY',
        value: '',
        applicationId: '',
      });
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create credential');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Credential">
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
            onChange={(e) =>
              setFormData({ ...formData, name: e.target.value })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Production API Key"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Application *
          </label>
          <select
            required
            value={formData.applicationId}
            onChange={(e) =>
              setFormData({ ...formData, applicationId: e.target.value })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select an application</option>
            {applications.map((app) => (
              <option key={app.id} value={app.id}>
                {app.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Type *
          </label>
          <select
            required
            value={formData.type}
            onChange={(e) =>
              setFormData({ ...formData, type: e.target.value })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="API_KEY">API Key</option>
            <option value="PASSWORD">Password</option>
            <option value="TOKEN">Token</option>
            <option value="SECRET">Secret</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Value *
          </label>
          <input
            type="password"
            required
            value={formData.value}
            onChange={(e) =>
              setFormData({ ...formData, value: e.target.value })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
            placeholder="sk_live_..."
          />
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
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Optional description..."
          />
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Creating...' : 'Create Credential'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function EditCredentialModal({
  isOpen,
  onClose,
  onSuccess,
  credential,
  applications,
}) {
  const [formData, setFormData] = useState({
    name: credential.name,
    description: credential.description || '',
    type: credential.type,
    applicationId: credential.applicationId,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await credentialsAPI.update(credential.id, formData);
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update credential');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Credential">
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
            onChange={(e) =>
              setFormData({ ...formData, name: e.target.value })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Application *
          </label>
          <select
            required
            value={formData.applicationId}
            onChange={(e) =>
              setFormData({ ...formData, applicationId: e.target.value })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {applications.map((app) => (
              <option key={app.id} value={app.id}>
                {app.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Type *
          </label>
          <select
            required
            value={formData.type}
            onChange={(e) =>
              setFormData({ ...formData, type: e.target.value })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="API_KEY">API Key</option>
            <option value="PASSWORD">Password</option>
            <option value="TOKEN">Token</option>
            <option value="SECRET">Secret</option>
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
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded">
          <p className="text-sm text-yellow-800">
            The encrypted value cannot be updated through this form. To change
            the value, delete and recreate the credential.
          </p>
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Updating...' : 'Update Credential'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
