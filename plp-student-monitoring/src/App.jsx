// src/App.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';

import DashboardLayout from './components/DashboardLayout'; // contains Sidebar
import Login from './pages/Login';
import Dashboard from './adminpages/Dashboard';
import Monitor from './adminpages/Monitor';
import Records from './adminpages/Records';
import Students from './adminpages/Students';
import Analytics from './adminpages/Analytics';
import FaceRecognition from './pages/FaceRecognition';

import Forgot from './pages/ForgotPass';
import Forgot2 from './pages/ForgotPass2';
import RegisterStudent from './components/RegisterStudent';
function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public route */}
        <Route path="/" element={<Login />} />
        <Route path="/forgotpass" element={<Forgot />} />
        <Route path="/forgotpass2" element={<Forgot2 />} />
        <Route path="/facerecog" element={<FaceRecognition />} />
        <Route path="/registerstudent" element={<RegisterStudent />} />
        {/* Protected routes */}
        <Route>
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/monitor" element={<Monitor />} />
            <Route path="/records" element={<Records />} />
            <Route path="/students" element={<Students />} />
            <Route path="/analytics" element={<Analytics />} />
          </Route>
        </Route>

        {/* Optional 404 */}
        <Route path="*" element={<div>404 - Not Found</div>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
