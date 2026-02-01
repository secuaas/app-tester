import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { testsAPI, testStepsAPI, applicationsAPI } from '../services/api';
import {
  ArrowLeft,
  Play,
  Save,
  Plus,
  Trash2,
  GripVertical,
  ChevronDown,
  ChevronUp,
  Copy,
} from 'lucide-react';
import Button from '../components/Button';
import Badge from '../components/Badge';
import Modal from '../components/Modal';

export default function TestDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [test, setTest] = useState(null);
  const [steps, setSteps] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddStepModal, setShowAddStepModal] = useState(false);
  const [showDeleteStepModal, setShowDeleteStepModal] = useState(false);
  const [selectedStep, setSelectedStep] = useState(null);
  const [expandedSteps, setExpandedSteps] = useState({});

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const [testRes, stepsRes, appsRes] = await Promise.all([
        testsAPI.get(id),
        testStepsAPI.list({ testId: id }),
        applicationsAPI.list(),
      ]);
      setTest(testRes.data);
      setSteps(stepsRes.data.data || []);
      setApplications(appsRes.data.data || []);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTest = async () => {
    setSaving(true);
    try {
      await testsAPI.update(id, {
        name: test.name,
        description: test.description,
        applicationId: test.applicationId,
        type: test.type,
        isActive: test.isActive,
      });
      alert('Test saved successfully');
    } catch (error) {
      console.error('Failed to save test:', error);
      alert('Failed to save test');
    } finally {
      setSaving(false);
    }
  };

  const handleExecuteTest = async () => {
    try {
      const { data } = await testsAPI.execute(id, {
        environmentId: test.application?.environments?.[0]?.id,
      });
      navigate(`/executions/${data.executionId}`);
    } catch (error) {
      console.error('Failed to execute test:', error);
      alert('Failed to execute test');
    }
  };

  const handleDeleteStep = async () => {
    try {
      await testStepsAPI.delete(selectedStep.id);
      await loadData();
      setShowDeleteStepModal(false);
      setSelectedStep(null);
    } catch (error) {
      console.error('Failed to delete step:', error);
    }
  };

  const handleDuplicateStep = async (step) => {
    try {
      await testStepsAPI.create({
        testId: id,
        name: `${step.name} (Copy)`,
        type: step.type,
        order: steps.length,
        config: step.config,
      });
      await loadData();
    } catch (error) {
      console.error('Failed to duplicate step:', error);
    }
  };

  const toggleStepExpanded = (stepId) => {
    setExpandedSteps((prev) => ({
      ...prev,
      [stepId]: !prev[stepId],
    }));
  };

  const moveStep = async (stepId, direction) => {
    const stepIndex = steps.findIndex((s) => s.id === stepId);
    if (stepIndex === -1) return;

    const newIndex = direction === 'up' ? stepIndex - 1 : stepIndex + 1;
    if (newIndex < 0 || newIndex >= steps.length) return;

    const newSteps = [...steps];
    [newSteps[stepIndex], newSteps[newIndex]] = [newSteps[newIndex], newSteps[stepIndex]];

    setSteps(newSteps);

    try {
      await Promise.all(
        newSteps.map((step, index) =>
          testStepsAPI.update(step.id, { order: index })
        )
      );
    } catch (error) {
      console.error('Failed to reorder steps:', error);
      await loadData();
    }
  };

  const getStepIcon = (type) => {
    const icons = {
      HTTP_REQUEST: '🌐',
      ASSERTION: '✓',
      WAIT: '⏱️',
      SCREENSHOT: '📸',
      CLICK: '👆',
      TYPE: '⌨️',
      NAVIGATE: '➡️',
    };
    return icons[type] || '📝';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!test) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Test not found</h3>
        <Link to="/tests">
          <Button>Back to Tests</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link to="/tests">
            <button className="text-gray-400 hover:text-gray-600">
              <ArrowLeft className="h-6 w-6" />
            </button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{test.name}</h1>
            <p className="mt-1 text-sm text-gray-500">{test.description}</p>
          </div>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" icon={Save} onClick={handleSaveTest} disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
          <Button icon={Play} onClick={handleExecuteTest}>
            Run Test
          </Button>
        </div>
      </div>

      {/* Test Info */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Test Name
            </label>
            <input
              type="text"
              value={test.name}
              onChange={(e) => setTest({ ...test, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Application
            </label>
            <select
              value={test.applicationId}
              onChange={(e) =>
                setTest({ ...test, applicationId: e.target.value })
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
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Type
            </label>
            <select
              value={test.type}
              onChange={(e) => setTest({ ...test, type: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="API">API</option>
              <option value="E2E">E2E</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={test.isActive}
                onChange={(e) =>
                  setTest({ ...test, isActive: e.target.checked })
                }
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Active</span>
            </label>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={test.description || ''}
              onChange={(e) =>
                setTest({ ...test, description: e.target.value })
              }
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Test Steps ({steps.length})
          </h2>
          <Button
            size="sm"
            icon={Plus}
            onClick={() => setShowAddStepModal(true)}
          >
            Add Step
          </Button>
        </div>

        {steps.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">No steps defined yet</p>
            <Button icon={Plus} onClick={() => setShowAddStepModal(true)}>
              Add First Step
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {steps.map((step, index) => (
              <div key={step.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-start space-x-3">
                  <div className="flex flex-col items-center space-y-1 pt-1">
                    <button
                      onClick={() => moveStep(step.id, 'up')}
                      disabled={index === 0}
                      className="text-gray-400 hover:text-blue-600 disabled:opacity-30"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </button>
                    <GripVertical className="h-5 w-5 text-gray-400" />
                    <button
                      onClick={() => moveStep(step.id, 'down')}
                      disabled={index === steps.length - 1}
                      className="text-gray-400 hover:text-blue-600 disabled:opacity-30"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{getStepIcon(step.type)}</span>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium text-gray-500">
                              Step {index + 1}
                            </span>
                            <Badge variant="info">{step.type}</Badge>
                          </div>
                          <h3 className="text-sm font-semibold text-gray-900">
                            {step.name}
                          </h3>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => toggleStepExpanded(step.id)}
                          className="text-gray-400 hover:text-blue-600"
                          title={expandedSteps[step.id] ? 'Collapse' : 'Expand'}
                        >
                          {expandedSteps[step.id] ? (
                            <ChevronUp className="h-5 w-5" />
                          ) : (
                            <ChevronDown className="h-5 w-5" />
                          )}
                        </button>
                        <button
                          onClick={() => handleDuplicateStep(step)}
                          className="text-gray-400 hover:text-blue-600"
                          title="Duplicate"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedStep(step);
                            setShowDeleteStepModal(true);
                          }}
                          className="text-gray-400 hover:text-red-600"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {expandedSteps[step.id] && (
                      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                        <pre className="text-xs text-gray-700 overflow-x-auto">
                          {JSON.stringify(step.config, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Step Modal */}
      <AddStepModal
        isOpen={showAddStepModal}
        onClose={() => setShowAddStepModal(false)}
        onSuccess={() => {
          setShowAddStepModal(false);
          loadData();
        }}
        testId={id}
        order={steps.length}
        testType={test.type}
      />

      {/* Delete Step Modal */}
      <Modal
        isOpen={showDeleteStepModal}
        onClose={() => setShowDeleteStepModal(false)}
        title="Delete Step"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Are you sure you want to delete step{' '}
            <strong>{selectedStep?.name}</strong>?
          </p>
          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={() => setShowDeleteStepModal(false)}
            >
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDeleteStep}>
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function AddStepModal({ isOpen, onClose, onSuccess, testId, order, testType }) {
  const [formData, setFormData] = useState({
    name: '',
    type: testType === 'API' ? 'HTTP_REQUEST' : 'NAVIGATE',
    config: {},
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const apiStepTypes = [
    { value: 'HTTP_REQUEST', label: 'HTTP Request', icon: '🌐' },
    { value: 'ASSERTION', label: 'Assertion', icon: '✓' },
    { value: 'WAIT', label: 'Wait', icon: '⏱️' },
  ];

  const e2eStepTypes = [
    { value: 'NAVIGATE', label: 'Navigate', icon: '➡️' },
    { value: 'CLICK', label: 'Click', icon: '👆' },
    { value: 'TYPE', label: 'Type Text', icon: '⌨️' },
    { value: 'SCREENSHOT', label: 'Screenshot', icon: '📸' },
    { value: 'ASSERTION', label: 'Assertion', icon: '✓' },
    { value: 'WAIT', label: 'Wait', icon: '⏱️' },
  ];

  const stepTypes = testType === 'API' ? apiStepTypes : e2eStepTypes;

  const getDefaultConfig = (type) => {
    const configs = {
      HTTP_REQUEST: {
        method: 'GET',
        url: '',
        headers: {},
        body: null,
      },
      ASSERTION: {
        type: 'equals',
        expected: '',
        actual: '${response.status}',
      },
      WAIT: {
        duration: 1000,
      },
      NAVIGATE: {
        url: '',
      },
      CLICK: {
        selector: '',
      },
      TYPE: {
        selector: '',
        text: '',
      },
      SCREENSHOT: {
        name: 'screenshot',
      },
    };
    return configs[type] || {};
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await testStepsAPI.create({
        testId,
        name: formData.name,
        type: formData.type,
        order,
        config: formData.config,
      });
      setFormData({
        name: '',
        type: testType === 'API' ? 'HTTP_REQUEST' : 'NAVIGATE',
        config: {},
      });
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create step');
    } finally {
      setLoading(false);
    }
  };

  const handleTypeChange = (type) => {
    setFormData({
      ...formData,
      type,
      config: getDefaultConfig(type),
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Test Step">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Step Name *
          </label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) =>
              setFormData({ ...formData, name: e.target.value })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., Check login response"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Step Type *
          </label>
          <div className="grid grid-cols-2 gap-2">
            {stepTypes.map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => handleTypeChange(type.value)}
                className={`p-3 border rounded-lg text-left transition-colors ${
                  formData.type === type.value
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <span className="text-xl">{type.icon}</span>
                  <span className="text-sm font-medium">{type.label}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Configuration (JSON)
          </label>
          <textarea
            value={JSON.stringify(formData.config, null, 2)}
            onChange={(e) => {
              try {
                setFormData({ ...formData, config: JSON.parse(e.target.value) });
                setError('');
              } catch (err) {
                setError('Invalid JSON configuration');
              }
            }}
            rows={8}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
          />
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Creating...' : 'Create Step'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
