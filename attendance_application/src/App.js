import React, { useState } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import LandingPage from './SCAN/LandingPage';
import AdminDashboard from './ADMIN/AdminDashboard';
import './App.css';

const LOGO_KEY = 'institution_logo';
const NAME_KEY = 'institution_name';

function App() {
  const [currentPage, setCurrentPage] = useState('landing');

  // ── Branding state lives here so both LandingPage and AdminDashboard share it ──
  const [branding, setBranding] = useState({
    logo: localStorage.getItem(LOGO_KEY) || null,
    name: localStorage.getItem(NAME_KEY) || 'INSTITUTIONAL ADMIN SUPPORT',
  });

  const handleBrandingChange = ({ logo, name }) => {
    setBranding({
      logo: logo || branding.logo,
      name: name || branding.name,
    });
  };

  const handleBackToHome = () => setCurrentPage('landing');
  const handleSecretAdmin = () => setCurrentPage('admin');

  return (
    <>
      {currentPage === 'landing' && (
        <LandingPage
          branding={branding}
          onBack={handleBackToHome}
          onSelectMode={(mode) => { if (mode === 'admin') setCurrentPage('admin'); }}
          onNavigateAdmin={handleSecretAdmin}
        />
      )}

      {currentPage === 'admin' && (
        <AdminDashboard
          branding={branding}
          onBrandingChange={handleBrandingChange}
          onLogout={handleBackToHome}
        />
      )}
    </>
  );
}

export default App;