import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import Login from './components/Login';
import HeadacheForm from './components/HeadacheForm';
import PreventiveForm from './components/PreventiveForm';
import PeriodForm from './components/PeriodForm';
import History from './components/History';
import Report from './components/Report';
import './App.css';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading">Loading...</div>;
  return user ? children : <Navigate to="/login" />;
}

function AdminRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading">Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  if (user.role === 'guest') return <Navigate to="/" />;
  return children;
}

function AppRoutes() {
  return (
    <div className="app">
      <Header />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/login" element={<Login />} />
          <Route path="/record" element={<AdminRoute><HeadacheForm /></AdminRoute>} />
          <Route path="/record/:id" element={<AdminRoute><HeadacheForm /></AdminRoute>} />
          <Route path="/preventive" element={<AdminRoute><PreventiveForm /></AdminRoute>} />
          <Route path="/preventive/:id" element={<AdminRoute><PreventiveForm /></AdminRoute>} />
          <Route path="/period" element={<AdminRoute><PeriodForm /></AdminRoute>} />
          <Route path="/period/:id" element={<AdminRoute><PeriodForm /></AdminRoute>} />
          <Route path="/history" element={<ProtectedRoute><History /></ProtectedRoute>} />
          <Route path="/report" element={<ProtectedRoute><Report /></ProtectedRoute>} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
