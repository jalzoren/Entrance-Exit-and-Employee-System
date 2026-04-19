import React, { useState } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import LandingPage from './SCAN/LandingPage';   
import AdminDashboard from './ADMIN/AdminDashboard';
import './App.css';

function App() {
  const [currentPage, setCurrentPage] = useState('landing');

  const handleSelectMode = (mode) => {
    if (mode === 'admin') {
      setCurrentPage('admin');
    }
  };

  const handleBackToHome = () => {
    setCurrentPage('landing');
  };

  const handleSecretAdmin = () => {
    setCurrentPage('admin');
  };

  return (
    <>
      {currentPage === 'landing' && (
        <LandingPage
          onBack={handleBackToHome}
          onNavigateAdmin={handleSecretAdmin}
        />
      )}

      {currentPage === 'admin' && (
        <AdminDashboard onLogout={handleBackToHome} />
      )}
    </>
  );
}

export default App;