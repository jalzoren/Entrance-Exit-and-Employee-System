// src/components/Sidebar.jsx
import React, { useState } from "react"; // Remove useEffect
import { NavLink, useNavigate } from "react-router-dom";
import {
  FiHome,
  FiMonitor,
  FiFileText,
  FiUsers,
  FiBarChart2,
  FiMenu,
  FiSettings,
  FiLogOut,
} from "react-icons/fi";
import Swal from 'sweetalert2';
import logo from "../assets/llogoplp.png";
import "../componentscss/Sidebar.css";
import { useAuth } from "../context/AuthContext";

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(true);
  const { user, logout } = useAuth(); // Get user from AuthContext
  const navigate = useNavigate();

  const toggleSidebar = () => setIsOpen((prev) => !prev);

  const handleLogout = async () => {
    const result = await Swal.fire({
      title: 'Logout',
      text: 'Are you sure you want to logout?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, logout',
      cancelButtonText: 'Cancel'
    });

    if (result.isConfirmed) {
      await logout();
      navigate('/login');
    }
  };

  // Menu items based on user role
  const getMenuItems = () => {
    // Super Admin gets ALL menu items
    if (user?.role === 'Super Admin') {
      return [
        { icon: <FiHome />, label: "Super Dashboard", path: "/superdashboard" },
        { icon: <FiUsers />, label: "User Management", path: "/users" },
        { icon: <FiUsers />, label: "Student Management", path: "/superstudents" },
        { icon: <FiSettings />, label: "System Settings", path: "/systemsettings" },
        { type: 'separator', label: 'Entrance and Exit Monitoring' },
        { icon: <FiMonitor />, label: "Real-Time Monitor", path: "/monitor" },
        { icon: <FiFileText />, label: "Entry-Exit Records", path: "/records" },
        { icon: <FiBarChart2 />, label: "Analytics & Reports", path: "/analytics" },
        { type: 'separator', label: 'Employee Attendance Monitoring' },
        { icon: <FiHome />, label: "Attendance Dashboard", path: "/employee-dashboard" },
        { icon: <FiFileText />, label: "Attendance Records", path: "/employee-records" },
        { icon: <FiBarChart2 />, label: "Attendance Reports", path: "/employee-reports" },
      ];
    } 
    // Regular admins (EEMS/EAMS) get limited menu
    else {
      return [
        { icon: <FiHome />, label: "Dashboard", path: "/dashboard" },
        { icon: <FiUsers />, label: "Student Management", path: "/students" },
        { icon: <FiMonitor />, label: "Real-Time Monitor", path: "/monitor" },
        { icon: <FiFileText />, label: "Entry-Exit Records", path: "/records" },
        { icon: <FiBarChart2 />, label: "Analytics & Reports", path: "/analytics" },
      ];
    }
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  const menuItems = getMenuItems();

  // No loading check needed since AuthContext handles it

  return (
    <>
      <button
        className={`sidebar-toggle-btn ${isOpen ? "open" : "collapsed"}`}
        onClick={toggleSidebar}
        aria-label={isOpen ? "Collapse sidebar" : "Expand sidebar"}
        title={isOpen ? "Collapse" : "Expand"}
      >
        <FiMenu size={20} />
      </button>
      
      <aside className={`sidebar ${isOpen ? "open" : "collapsed"}`}>
        <div className="logo-container">
          {isOpen && (
            <div className="brand-text">
              <img src={logo} alt="Logo" className="brand-image" />
              <h1 className="brand-title">
                {user?.role === 'Super Admin' 
                  ? 'Smart Entrance, Exit, and Attendance'
                  : 'Entrance and Exit'}
              </h1>
              <p className="brand-subtitle">Monitoring System</p>
            </div>
          )}
        </div>

        <nav className="sidebar-nav">
          {menuItems.map((item, index) => {
            if (item.type === 'separator') {
              return isOpen ? (
                <div key={`sep-${index}`} className="sidebar-separator">
                  {item.label}
                </div>
              ) : null;
            }
            
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `sidebar-item ${isActive ? "active" : ""}`
                }
                title={!isOpen ? item.label : undefined}
              >
                <span className="item-icon">{item.icon}</span>
                {isOpen && <span className="item-label">{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>

        <div className="sidebar-user">
          <div className="user-avatar">{getInitials(user?.fullname)}</div>
          {isOpen && (
            <div className="user-details">
              <div className="user-name">{user?.fullname || 'Admin User'}</div>
              <div className="user-role">{user?.role || 'ADMIN'}</div>
              <button onClick={handleLogout} className="profile-link logout-btn">
                <FiLogOut /> Logout
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}