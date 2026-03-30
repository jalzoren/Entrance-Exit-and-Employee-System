// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { LogProvider } from "./context/LogContext";
import { CameraProvider } from "./context/CameraContext.jsx";

// Layout
import DashboardLayout from "./layouts/DashboardLayout";

// Public Pages
import Login from "./pages/Login";
import ForgotPass from "./pages/ForgotPass";
import ForgotPass2 from "./pages/ForgotPass2";
import FaceRecognition from "./pages/FaceRecognition";

// Admin Pages
import Dashboard from "./pages/adminpages/Dashboard";
import Monitor from "./pages/adminpages/Monitor";
import Records from "./pages/adminpages/Records";
import Students from "./pages/adminpages/Students";
import Analytics from "./pages/adminpages/Analytics";

// Super Admin Pages
import Users from "./pages/superadminpages/Users";
import SystemSettings from "./pages/superadminpages/SystemSettings/SystemSettings";
import SuperDashboard from "./pages/superadminpages/SuperDashboard";
import SuperStudents from "./pages/superadminpages/SuperStudents";

// Components
import RegisterStudent from "./components/RegisterStudent";
import ProtectedRoute from "./components/ProtectedRoute";

// Loading component
const LoadingScreen = () => (
  <div className="loading-screen">
    <div className="spinner"></div>
    <p>Loading...</p>
  </div>
);

// Role-based redirect component
const RoleBasedRedirect = () => {
  const { user, authenticated, loading } = useAuth();
  
  if (loading) {
    return <LoadingScreen />;
  }
  
  if (!authenticated) {
    return <Navigate to="/login" replace />;
  }
  
  if (user?.role === 'Super Admin') {
    return <Navigate to="/superdashboard" replace />;
  } else {
    return <Navigate to="/dashboard" replace />;
  }
};

function AppRoutes() {
  const { loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/forgotpass" element={<ForgotPass />} />
      <Route path="/forgotpass2" element={<ForgotPass2 />} />
      <Route path="/facerecog" element={<FaceRecognition />} />

      {/* Root path - redirect based on role */}
      <Route path="/" element={<RoleBasedRedirect />} />

      {/* Protected Routes - Single Layout for all authenticated users */}
      <Route element={<DashboardLayout />}>
        {/* Admin Routes - Only accessible by EEMS/EAMS Admins */}
        <Route path="/dashboard" element={
          <ProtectedRoute allowedRoles={['EEMS Admin', 'EAMS Admin']}>
            <Dashboard />
          </ProtectedRoute>
        } />
        <Route path="/monitor" element={
          <ProtectedRoute allowedRoles={['EEMS Admin', 'EAMS Admin', 'Super Admin']}>
            <Monitor />
          </ProtectedRoute>
        } />
        <Route path="/records" element={
          <ProtectedRoute allowedRoles={['EEMS Admin', 'EAMS Admin', 'Super Admin']}>
            <Records />
          </ProtectedRoute>
        } />
        <Route path="/students" element={
          <ProtectedRoute allowedRoles={['EEMS Admin', 'EAMS Admin', 'Super Admin']}>
            <Students />
          </ProtectedRoute>
        } />
        <Route path="/analytics" element={
          <ProtectedRoute allowedRoles={['EEMS Admin', 'EAMS Admin', 'Super Admin']}>
            <Analytics />
          </ProtectedRoute>
        } />

        {/* Super Admin Routes - Only accessible by Super Admin */}
        <Route path="/superdashboard" element={
          <ProtectedRoute allowedRoles={['Super Admin']}>
            <SuperDashboard />
          </ProtectedRoute>
        } />
        <Route path="/users" element={
          <ProtectedRoute allowedRoles={['Super Admin']}>
            <Users />
          </ProtectedRoute>
        } />
        <Route path="/systemsettings" element={
          <ProtectedRoute allowedRoles={['Super Admin']}>
            <SystemSettings />
          </ProtectedRoute>
        } />
        <Route path="/superstudents" element={
          <ProtectedRoute allowedRoles={['Super Admin']}>
            <SuperStudents />
          </ProtectedRoute>
        } />
      </Route>

      {/* 404 */}
      <Route path="*" element={<div>404 - Not Found</div>} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CameraProvider>
          <LogProvider>
            <AppRoutes />
          </LogProvider>
        </CameraProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;