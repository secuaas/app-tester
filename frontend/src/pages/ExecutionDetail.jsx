import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { executionsAPI } from '../services/api';
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Download,
  RotateCcw,
  Eye,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import Button from '../components/Button';
import Badge from '../components/Badge';

export default function ExecutionDetail() {
  const { id } = useParams();
  const [execution, setExecution] = useState(null);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedSteps, setExpandedSteps] = useState({});

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
  }, [id]);

  const loadData = async () => {
    try {
      const [execRes, resultsRes] = await Promise.all([
        executionsAPI.get(id),
        executionsAPI.getResults(id),
      ]);
      setExecution(execRes.data);
      setResults(resultsRes.data);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const blob = new Blob([JSON.stringify(results, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `execution-${id}-results.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export results:', error);
    }
  };

  const toggleStepExpanded = (stepId) => {
    setExpandedSteps((prev) => ({
      ...prev,
      [stepId]: !prev[stepId],
    }));
  };

  const getStatusBadge = (status) => {
    const variants = {
      SUCCESS: 'success',
      FAILED: 'error',
      RUNNING: 'info',
      PENDING: 'warning',
      CANCELLED: 'default',
      SKIPPED: 'default',
    };
    const icons = {
      SUCCESS: CheckCircle,
      FAILED: XCircle,
      RUNNING: Clock,
      PENDING: AlertTriangle,
      CANCELLED: XCircle,
      SKIPPED: AlertTriangle,
    };
    const Icon = icons[status] || Clock;
    return (
      <Badge variant={variants[status] || 'default'}>
        <Icon className="h-3 w-3 mr-1 inline" />
        {status}
      </Badge>
    );
  };

  const formatDuration = (ms) => {
    if (!ms) return 'N/A';
    if (ms < 1000) return `${ms}ms`;
    const seconds = Math.floor(ms / 1000);
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
      second: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!execution) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Execution not found
        </h3>
        <Link to="/executions">
          <Button>Back to Executions</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link to="/executions">
            <button className="text-gray-400 hover:text-gray-600">
              <ArrowLeft className="h-6 w-6" />
            </button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {execution.test?.name || 'Unknown Test'}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Execution #{id.substring(0, 8)}
            </p>
          </div>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" icon={Download} onClick={handleExport}>
            Export Results
          </Button>
          {execution.status === 'FAILED' && (
            <Link to={`/tests/${execution.testId}`}>
              <Button icon={RotateCcw}>Retry</Button>
            </Link>
          )}
        </div>
      </div>

      {/* Execution Summary */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <p className="text-sm text-gray-500">Status</p>
            <div className="mt-1">{getStatusBadge(execution.status)}</div>
          </div>
          <div>
            <p className="text-sm text-gray-500">Duration</p>
            <p className="mt-1 text-lg font-semibold text-gray-900">
              {formatDuration(execution.duration)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Steps Progress</p>
            <p className="mt-1 text-lg font-semibold text-gray-900">
              {execution.stepsCompleted || 0} / {execution.stepsTotal || 0}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Failed Steps</p>
            <p className="mt-1 text-lg font-semibold text-red-600">
              {execution.stepsFailed || 0}
            </p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 border-t">
          <div>
            <p className="text-sm text-gray-500">Application</p>
            <p className="mt-1 text-sm font-medium text-gray-900">
              {execution.application?.name || 'N/A'}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Environment</p>
            <p className="mt-1 text-sm font-medium text-gray-900">
              {execution.environment?.name || 'N/A'}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Started At</p>
            <p className="mt-1 text-sm font-medium text-gray-900">
              {formatDateTime(execution.startedAt)}
            </p>
          </div>
        </div>

        {execution.error && (
          <div className="mt-6 pt-6 border-t">
            <p className="text-sm font-medium text-red-600 mb-2">Error</p>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <pre className="text-xs text-red-800 whitespace-pre-wrap">
                {execution.error}
              </pre>
            </div>
          </div>
        )}
      </div>

      {/* Step Results */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Step Results</h2>
        </div>

        {!results?.steps || results.steps.length === 0 ? (
          <div className="text-center py-12">
            <Clock className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">
              {execution.status === 'RUNNING'
                ? 'Execution in progress...'
                : 'No step results available'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {results.steps.map((step, index) => (
              <div key={index} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    <div className="mt-1">
                      {step.status === 'SUCCESS' ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : step.status === 'FAILED' ? (
                        <XCircle className="h-5 w-5 text-red-600" />
                      ) : step.status === 'RUNNING' ? (
                        <Clock className="h-5 w-5 text-blue-600 animate-spin" />
                      ) : (
                        <AlertTriangle className="h-5 w-5 text-gray-400" />
                      )}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h3 className="text-sm font-semibold text-gray-900">
                          Step {index + 1}: {step.name}
                        </h3>
                        <Badge variant="info">{step.type}</Badge>
                        {getStatusBadge(step.status)}
                      </div>

                      <div className="mt-2 flex items-center space-x-6 text-xs text-gray-500">
                        <span>Duration: {formatDuration(step.duration)}</span>
                        {step.startedAt && (
                          <span>Started: {formatDateTime(step.startedAt)}</span>
                        )}
                      </div>

                      {step.error && (
                        <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3">
                          <p className="text-xs font-medium text-red-600 mb-1">
                            Error
                          </p>
                          <pre className="text-xs text-red-800 whitespace-pre-wrap">
                            {step.error}
                          </pre>
                        </div>
                      )}

                      {expandedSteps[index] && step.result && (
                        <div className="mt-3">
                          <div className="bg-gray-50 rounded-lg p-3">
                            <p className="text-xs font-medium text-gray-700 mb-2">
                              Step Result
                            </p>
                            <pre className="text-xs text-gray-600 overflow-x-auto whitespace-pre-wrap">
                              {typeof step.result === 'string'
                                ? step.result
                                : JSON.stringify(step.result, null, 2)}
                            </pre>
                          </div>

                          {step.request && (
                            <div className="mt-3 bg-blue-50 rounded-lg p-3">
                              <p className="text-xs font-medium text-blue-700 mb-2">
                                Request
                              </p>
                              <pre className="text-xs text-blue-600 overflow-x-auto">
                                {JSON.stringify(step.request, null, 2)}
                              </pre>
                            </div>
                          )}

                          {step.response && (
                            <div className="mt-3 bg-green-50 rounded-lg p-3">
                              <p className="text-xs font-medium text-green-700 mb-2">
                                Response
                              </p>
                              <pre className="text-xs text-green-600 overflow-x-auto">
                                {JSON.stringify(step.response, null, 2)}
                              </pre>
                            </div>
                          )}

                          {step.screenshot && (
                            <div className="mt-3">
                              <p className="text-xs font-medium text-gray-700 mb-2">
                                Screenshot
                              </p>
                              <img
                                src={step.screenshot}
                                alt="Screenshot"
                                className="max-w-full border border-gray-300 rounded-lg"
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => toggleStepExpanded(index)}
                    className="ml-4 text-gray-400 hover:text-blue-600"
                    title={expandedSteps[index] ? 'Collapse' : 'Expand'}
                  >
                    {expandedSteps[index] ? (
                      <ChevronUp className="h-5 w-5" />
                    ) : (
                      <ChevronDown className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Metadata */}
      {results?.metadata && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Execution Metadata
          </h2>
          <pre className="text-xs text-gray-700 bg-gray-50 rounded-lg p-4 overflow-x-auto">
            {JSON.stringify(results.metadata, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
