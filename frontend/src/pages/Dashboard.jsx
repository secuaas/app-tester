import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { applicationsAPI, testsAPI, executionsAPI } from '../services/api';
import {
  Boxes,
  TestTube2,
  Play,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  ArrowRight,
} from 'lucide-react';

export default function Dashboard() {
  const [stats, setStats] = useState({
    applications: 0,
    tests: 0,
    executions: 0,
    successRate: 0,
  });
  const [recentExecutions, setRecentExecutions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const [appsRes, testsRes, execsRes] = await Promise.all([
        applicationsAPI.list(),
        testsAPI.list(),
        executionsAPI.list({ limit: 10 }),
      ]);

      const executions = execsRes.data.data || [];
      const passed = executions.filter((e) => e.status === 'PASSED').length;
      const successRate = executions.length > 0
        ? Math.round((passed / executions.length) * 100)
        : 0;

      setStats({
        applications: appsRes.data.data?.length || 0,
        tests: testsRes.data.data?.length || 0,
        executions: executions.length,
        successRate,
      });

      setRecentExecutions(executions.slice(0, 5));
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      name: 'Applications',
      value: stats.applications,
      icon: Boxes,
      color: 'blue',
      href: '/applications',
    },
    {
      name: 'Test Suites',
      value: stats.tests,
      icon: TestTube2,
      color: 'purple',
      href: '/tests',
    },
    {
      name: 'Executions',
      value: stats.executions,
      icon: Play,
      color: 'green',
      href: '/executions',
    },
    {
      name: 'Success Rate',
      value: `${stats.successRate}%`,
      icon: TrendingUp,
      color: 'orange',
    },
  ];

  const getStatusIcon = (status) => {
    switch (status) {
      case 'PASSED':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'FAILED':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'RUNNING':
        return <Clock className="h-5 w-5 text-blue-500 animate-spin" />;
      default:
        return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status) => {
    const colors = {
      PASSED: 'bg-green-100 text-green-800',
      FAILED: 'bg-red-100 text-red-800',
      RUNNING: 'bg-blue-100 text-blue-800',
      PENDING: 'bg-yellow-100 text-yellow-800',
      ERROR: 'bg-red-100 text-red-800',
    };

    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-800'}`}
      >
        {status}
      </span>
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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Overview of your testing platform
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          const colorClasses = {
            blue: 'bg-blue-500',
            purple: 'bg-purple-500',
            green: 'bg-green-500',
            orange: 'bg-orange-500',
          };

          const card = (
            <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center">
                <div className={`${colorClasses[stat.color]} rounded-lg p-3`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
              </div>
            </div>
          );

          return stat.href ? (
            <Link key={stat.name} to={stat.href}>
              {card}
            </Link>
          ) : (
            <div key={stat.name}>{card}</div>
          );
        })}
      </div>

      {/* Recent Executions */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Recent Executions</h2>
          <Link
            to="/executions"
            className="text-sm font-medium text-blue-600 hover:text-blue-500 flex items-center"
          >
            View all
            <ArrowRight className="h-4 w-4 ml-1" />
          </Link>
        </div>

        <div className="divide-y divide-gray-200">
          {recentExecutions.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-500">
              <TestTube2 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No executions yet</p>
              <Link
                to="/tests"
                className="mt-2 text-blue-600 hover:text-blue-500 text-sm font-medium"
              >
                Create your first test suite
              </Link>
            </div>
          ) : (
            recentExecutions.map((execution) => (
              <Link
                key={execution.id}
                to={`/executions/${execution.id}`}
                className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-4 flex-1">
                  {getStatusIcon(execution.status)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {execution.testSuite?.name || 'Unknown Test Suite'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {execution.environment?.name || 'Unknown Environment'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  {getStatusBadge(execution.status)}
                  <span className="text-sm text-gray-500">
                    {new Date(execution.startedAt).toLocaleString()}
                  </span>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          to="/applications/new"
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow group"
        >
          <Boxes className="h-8 w-8 text-blue-600 mb-3" />
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            Create Application
          </h3>
          <p className="text-sm text-gray-600">
            Add a new application to test
          </p>
          <div className="mt-3 text-blue-600 group-hover:text-blue-700 flex items-center text-sm font-medium">
            Get started
            <ArrowRight className="h-4 w-4 ml-1" />
          </div>
        </Link>

        <Link
          to="/tests/new"
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow group"
        >
          <TestTube2 className="h-8 w-8 text-purple-600 mb-3" />
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            Create Test Suite
          </h3>
          <p className="text-sm text-gray-600">
            Build automated test scenarios
          </p>
          <div className="mt-3 text-purple-600 group-hover:text-purple-700 flex items-center text-sm font-medium">
            Get started
            <ArrowRight className="h-4 w-4 ml-1" />
          </div>
        </Link>

        <Link
          to="/credentials/new"
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow group"
        >
          <Key className="h-8 w-8 text-green-600 mb-3" />
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            Add Credential
          </h3>
          <p className="text-sm text-gray-600">
            Securely store API keys and tokens
          </p>
          <div className="mt-3 text-green-600 group-hover:text-green-700 flex items-center text-sm font-medium">
            Get started
            <ArrowRight className="h-4 w-4 ml-1" />
          </div>
        </Link>
      </div>
    </div>
  );
}
