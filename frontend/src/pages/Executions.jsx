import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { executionsAPI, testsAPI, applicationsAPI } from '../services/api';
import {
  PlayCircle,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Eye,
  RotateCcw,
  Download,
} from 'lucide-react';
import Badge from '../components/Badge';
import Button from '../components/Button';

export default function Executions() {
  const [executions, setExecutions] = useState([]);
  const [tests, setTests] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterApp, setFilterApp] = useState('');
  const [filterTest, setFilterTest] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  useEffect(() => {
    loadData();
  }, [filterApp, filterTest, filterStatus]);

  const loadData = async () => {
    try {
      const [executionsRes, testsRes, appsRes] = await Promise.all([
        executionsAPI.list({
          applicationId: filterApp,
          testId: filterTest,
          status: filterStatus,
        }),
        testsAPI.list(),
        applicationsAPI.list(),
      ]);
      setExecutions(executionsRes.data.data || []);
      setTests(testsRes.data.data || []);
      setApplications(appsRes.data.data || []);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = async (execution) => {
    try {
      await testsAPI.execute(execution.testId, {
        environmentId: execution.environmentId,
      });
      await loadData();
    } catch (error) {
      console.error('Failed to retry execution:', error);
    }
  };

  const handleExportResults = async (execution) => {
    try {
      const { data } = await executionsAPI.getResults(execution.id);
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `execution-${execution.id}-results.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export results:', error);
    }
  };

  const filteredExecutions = executions.filter((execution) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      execution.test?.name.toLowerCase().includes(searchLower) ||
      execution.application?.name.toLowerCase().includes(searchLower)
    );
  });

  const getStatusBadge = (status) => {
    const variants = {
      SUCCESS: 'success',
      FAILED: 'error',
      RUNNING: 'info',
      PENDING: 'warning',
      CANCELLED: 'default',
    };
    const icons = {
      SUCCESS: CheckCircle,
      FAILED: XCircle,
      RUNNING: Clock,
      PENDING: AlertTriangle,
      CANCELLED: XCircle,
    };
    const Icon = icons[status] || Clock;
    return (
      <Badge variant={variants[status] || 'default'}>
        <Icon className="h-3 w-3 mr-1 inline" />
        {status}
      </Badge>
    );
  };

  const formatDuration = (seconds) => {
    if (!seconds) return 'N/A';
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
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
          <h1 className="text-2xl font-bold text-gray-900">Executions</h1>
          <p className="mt-1 text-sm text-gray-500">
            View test execution history and results
          </p>
        </div>
        <Button icon={RotateCcw} onClick={loadData}>
          Refresh
        </Button>
      </div>

      {/* Filters & Search */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search executions..."
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
          value={filterTest}
          onChange={(e) => setFilterTest(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Tests</option>
          {tests.map((test) => (
            <option key={test.id} value={test.id}>
              {test.name}
            </option>
          ))}
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Statuses</option>
          <option value="SUCCESS">Success</option>
          <option value="FAILED">Failed</option>
          <option value="RUNNING">Running</option>
          <option value="PENDING">Pending</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      {/* Executions List */}
      {filteredExecutions.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <PlayCircle className="h-12 w-12 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No executions found
          </h3>
          <p className="text-gray-500 mb-4">
            Execute a test suite to see results here
          </p>
          <Link to="/tests">
            <Button icon={PlayCircle}>Go to Test Suites</Button>
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Test Suite
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Application
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Duration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Steps
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Started
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredExecutions.map((execution) => (
                <tr key={execution.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <PlayCircle className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {execution.test?.name || 'Unknown Test'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {execution.environment?.name || 'N/A'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {execution.application?.name || 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(execution.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDuration(execution.duration)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {execution.stepsCompleted || 0} / {execution.stepsTotal || 0}
                    </div>
                    {execution.stepsFailed > 0 && (
                      <div className="text-xs text-red-600">
                        {execution.stepsFailed} failed
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDateTime(execution.startedAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => handleExportResults(execution)}
                        className="text-gray-400 hover:text-blue-600"
                        title="Export Results"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                      {execution.status === 'FAILED' && (
                        <button
                          onClick={() => handleRetry(execution)}
                          className="text-gray-400 hover:text-blue-600"
                          title="Retry"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </button>
                      )}
                      <Link to={`/executions/${execution.id}`}>
                        <button
                          className="text-gray-400 hover:text-blue-600"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
