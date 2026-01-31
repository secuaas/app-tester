import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { testsAPI, applicationsAPI } from '../services/api';
import {
  Plus,
  Search,
  TestTube2,
  Play,
  Edit,
  Trash2,
  Copy,
  Download,
  Upload,
  Filter,
} from 'lucide-react';
import Modal from '../components/Modal';
import Button from '../components/Button';
import Badge from '../components/Badge';

export default function Tests() {
  const [tests, setTests] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterApp, setFilterApp] = useState('');
  const [filterType, setFilterType] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedTest, setSelectedTest] = useState(null);

  useEffect(() => {
    loadData();
  }, [filterApp, filterType]);

  const loadData = async () => {
    try {
      const [testsRes, appsRes] = await Promise.all([
        testsAPI.list({ applicationId: filterApp, type: filterType }),
        applicationsAPI.list(),
      ]);
      setTests(testsRes.data.data || []);
      setApplications(appsRes.data.data || []);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      await testsAPI.delete(selectedTest.id);
      await loadData();
      setShowDeleteModal(false);
      setSelectedTest(null);
    } catch (error) {
      console.error('Failed to delete test:', error);
    }
  };

  const handleDuplicate = async (test) => {
    try {
      await testsAPI.duplicate(test.id);
      await loadData();
    } catch (error) {
      console.error('Failed to duplicate test:', error);
    }
  };

  const handleExport = async (test) => {
    try {
      const { data } = await testsAPI.export(test.id);
      const blob = new Blob([data], { type: 'application/x-yaml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${test.name.replace(/\s+/g, '-').toLowerCase()}.yaml`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export test:', error);
    }
  };

  const filteredTests = tests.filter((test) =>
    test.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getTypeBadge = (type) => {
    const variants = { API: 'info', E2E: 'purple' };
    return <Badge variant={variants[type] || 'default'}>{type}</Badge>;
  };

  const getStatusBadge = (isActive) => {
    return isActive ? (
      <Badge variant="success">Active</Badge>
    ) : (
      <Badge variant="default">Inactive</Badge>
    );
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
          <h1 className="text-2xl font-bold text-gray-900">Test Suites</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage and execute your automated tests
          </p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" icon={Upload}>
            Import YAML
          </Button>
          <Button icon={Plus} onClick={() => setShowCreateModal(true)}>
            New Test Suite
          </Button>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-2 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search test suites..."
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

        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Types</option>
          <option value="API">API</option>
          <option value="E2E">E2E</option>
        </select>
      </div>

      {/* Test Suites List */}
      {filteredTests.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <TestTube2 className="h-12 w-12 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No test suites found
          </h3>
          <p className="text-gray-500 mb-4">
            Get started by creating your first test suite
          </p>
          <Button icon={Plus} onClick={() => setShowCreateModal(true)}>
            Create Test Suite
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
                  Steps
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTests.map((test) => (
                <tr key={test.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <TestTube2 className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {test.name}
                        </div>
                        {test.description && (
                          <div className="text-sm text-gray-500">
                            {test.description}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {test.application?.name || 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getTypeBadge(test.type)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {test.stepCount || 0} steps
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(test.isActive)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => handleExport(test)}
                        className="text-gray-400 hover:text-blue-600"
                        title="Export YAML"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDuplicate(test)}
                        className="text-gray-400 hover:text-blue-600"
                        title="Duplicate"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                      <Link to={`/tests/${test.id}`}>
                        <button className="text-gray-400 hover:text-blue-600" title="Edit">
                          <Edit className="h-4 w-4" />
                        </button>
                      </Link>
                      <button
                        onClick={() => {
                          setSelectedTest(test);
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
      <CreateTestModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          setShowCreateModal(false);
          loadData();
        }}
        applications={applications}
      />

      {/* Delete Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Test Suite"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Are you sure you want to delete{' '}
            <strong>{selectedTest?.name}</strong>? This will also delete all
            associated steps and execution history.
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

function CreateTestModal({ isOpen, onClose, onSuccess, applications }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    applicationId: '',
    type: 'API',
    tags: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await testsAPI.create(formData);
      setFormData({
        name: '',
        description: '',
        applicationId: '',
        type: 'API',
        tags: [],
      });
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create test suite');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Test Suite">
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
            placeholder="My API Tests"
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
            <option value="API">API</option>
            <option value="E2E">E2E</option>
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
            {loading ? 'Creating...' : 'Create Test Suite'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
