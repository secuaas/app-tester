import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Applications from './pages/Applications';
import Tests from './pages/Tests';
import TestDetail from './pages/TestDetail';
import Executions from './pages/Executions';
import ExecutionDetail from './pages/ExecutionDetail';
import Credentials from './pages/Credentials';
import RoleSelection from './pages/RoleSelection';
import SsoError from './pages/SsoError';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/auth/role-selection" element={<RoleSelection />} />
          <Route path="/auth/error" element={<SsoError />} />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout><Dashboard /></Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/applications"
            element={
              <ProtectedRoute>
                <Layout><Applications /></Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/tests"
            element={
              <ProtectedRoute>
                <Layout><Tests /></Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/tests/:id"
            element={
              <ProtectedRoute>
                <Layout><TestDetail /></Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/executions"
            element={
              <ProtectedRoute>
                <Layout><Executions /></Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/executions/:id"
            element={
              <ProtectedRoute>
                <Layout><ExecutionDetail /></Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/credentials"
            element={
              <ProtectedRoute>
                <Layout><Credentials /></Layout>
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
