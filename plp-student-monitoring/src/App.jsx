// src/App.jsx
import { BrowserRouter, Routes, Route } from "react-router-dom";

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
import SystemSettings from "./pages/superadminpages/SystemSettings";
import SuperDashboard from "./pages/superadminpages/SuperDashboard";
import SuperStudents from "./pages/superadminpages/SuperStudents";

// Components
import RegisterStudent from "./components/RegisterStudent";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Login />} />
        <Route path="/forgotpass" element={<ForgotPass />} />
        <Route path="/forgotpass2" element={<ForgotPass2 />} />
        <Route path="/facerecog" element={<FaceRecognition />} />
        <Route path="/registerstudent" element={<RegisterStudent />} />

        {/* Protected Routes - Single Layout for all authenticated users */}
        <Route element={<DashboardLayout />}>
          {/* Admin Routes */}
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/monitor" element={<Monitor />} />
          <Route path="/records" element={<Records />} />
          <Route path="/students" element={<Students />} />
          <Route path="/analytics" element={<Analytics />} />

          {/* Super Admin Routes */}
          <Route path="/users" element={<Users />} />
          <Route path="/systemsettings" element={<SystemSettings />} />
          <Route path="/superdashboard" element={<SuperDashboard />} />
          <Route path="/superstudents" element={<SuperStudents />} />
        </Route>

        {/* 404 */}
        <Route path="*" element={<div>404 - Not Found</div>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;