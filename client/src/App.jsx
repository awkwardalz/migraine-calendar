import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import Login from './components/Login';
import HeadacheForm from './components/HeadacheForm';
import PreventiveForm from './components/PreventiveForm';
import PeriodForm from './components/PeriodForm';
import History from './components/History';
import './App.css';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading">Loading...</div>;
  return user ? children : <Navigate to="/login" />;
}

function AppRoutes() {
  return (
    <div className="app">
      <Header />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/login" element={<Login />} />
          <Route path="/record" element={<ProtectedRoute><HeadacheForm /></ProtectedRoute>} />
          <Route path="/record/:id" element={<ProtectedRoute><HeadacheForm /></ProtectedRoute>} />
          <Route path="/preventive" element={<ProtectedRoute><PreventiveForm /></ProtectedRoute>} />
          <Route path="/preventive/:id" element={<ProtectedRoute><PreventiveForm /></ProtectedRoute>} />
          <Route path="/period" element={<ProtectedRoute><PeriodForm /></ProtectedRoute>} />
          <Route path="/period/:id" element={<ProtectedRoute><PeriodForm /></ProtectedRoute>} />
          <Route path="/history" element={<ProtectedRoute><History /></ProtectedRoute>} />
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
