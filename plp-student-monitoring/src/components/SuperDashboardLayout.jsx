// src/components/DashboardLayout.jsx
import React from 'react';
import { Outlet } from 'react-router-dom';
import SuperSidebar from '../components/SuperSidebar';
import '../componentscss/DashboardLayout.css';
export default function DashboardLayout() {
  return (
    <div className="dashboard-layout">
      <SuperSidebar />
      <div className="main-content">
        <Outlet />
      </div>
    </div>
  );
}