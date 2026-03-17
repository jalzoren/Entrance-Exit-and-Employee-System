// src/layouts/DashboardLayout.jsx
import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from '../layouts/Sidebar';
import '../componentscss/DashboardLayout.css';
import { useAuth } from '../context/AuthContext'; // Import useAuth

export default function DashboardLayout() {
  const { user, loading, authenticated } = useAuth(); // Get auth state
  const navigate = useNavigate();

  // Redirect if not authenticated
  React.useEffect(() => {
    if (!loading && !authenticated) {
      navigate('/login');
    }
  }, [loading, authenticated, navigate]);

  // Show loading while checking auth
  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  // Don't render if not authenticated (will redirect)
  if (!authenticated || !user) {
    return null;
  }

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <div className="main-content">
        <Outlet />
      </div>
    </div>
  );
}