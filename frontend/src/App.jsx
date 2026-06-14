/**
 * @fileoverview Main Application entry and Router.
 * @module App
 */

import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './hooks/use-auth';
import { ProtectedRoute } from './components/protected-route';
import { Login } from './pages/login';
import { UserDashboard } from './pages/user-dashboard';
import { AdminDashboard } from './pages/admin-dashboard';

function AppContent() {
  const { user } = useAuth();
  const [path, setPath] = useState(window.location.pathname);

  // Custom routing navigator
  function navigate(newPath) {
    window.history.pushState({}, '', newPath);
    setPath(newPath);
  }

  // Handle browser back/forward buttons
  useEffect(() => {
    function handlePopState() {
      setPath(window.location.pathname);
    }
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // If user is logged out, show the Login page
  if (!user) {
    return <Login />;
  }

  // Handle Routing switch
  if (path === '/admin') {
    return (
      <ProtectedRoute requireAdmin={true}>
        <AdminDashboard onNavigate={navigate} />
      </ProtectedRoute>
    );
  }

  // Default route (User dashboard / scanner)
  return (
    <ProtectedRoute>
      <UserDashboard onNavigate={navigate} />
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
