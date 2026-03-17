// src/components/Sidebar.jsx
import React, { useState, useEffect } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
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

// Then use it
<img src={logo} alt="Logo" className="brand-image" />
import "../componentscss/Sidebar.css";

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(true);
  const [user, setUser] = useState({ fullname: 'Loading...', role: 'admin' });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Fetch user data from MySQL
  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      // Get user ID from localStorage (or however you store it after login)
      const storedUser = localStorage.getItem('user');
      if (!storedUser) {
        navigate('/');
        return;
      }

      const parsedUser = JSON.parse(storedUser);
      
      // Fetch latest user data from MySQL
      const response = await fetch('http://localhost:5000/api/user/current', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'user-id': parsedUser.id // Send user ID in headers
        }
      });

      const data = await response.json();

      if (data.success) {
        setUser(data.user);
        // Update localStorage with latest data
        localStorage.setItem('user', JSON.stringify(data.user));
      } else {
        // If user not found, redirect to login
        localStorage.removeItem('user');
        navigate('/');
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      // Use cached data if available
      const cachedUser = localStorage.getItem('user');
      if (cachedUser) {
        setUser(JSON.parse(cachedUser));
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleSidebar = () => setIsOpen((prev) => !prev);

  const handleLogout = async () => {
    try {
      // Optional: Call logout API
      await fetch('http://localhost:5000/api/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear local storage and redirect
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      navigate('/');
      
      Swal.fire({
        icon: 'success',
        title: 'Logged Out',
        text: 'You have been successfully logged out',
        timer: 1500,
        showConfirmButton: false
      });
    }
  };

  // Menu items based on user role
  const getMenuItems = () => {
    const role = user.role?.toLowerCase() || 'admin';
    
    const baseItems = [
      { icon: <FiMonitor />, label: "Real-Time Monitor", path: "/monitor" },
      { icon: <FiFileText />, label: "Entry-Exit Records", path: "/records" },
      { icon: <FiBarChart2 />, label: "Analytics & Reports", path: "/analytics" },
    ];

    if (role === 'superadmin') {
      return [
        { icon: <FiHome />, label: "Super Dashboard", path: "/superdashboard" },
        { icon: <FiUsers />, label: "User Management", path: "/users" },
        { icon: <FiUsers />, label: "Student Management", path: "/superstudents" },
        { icon: <FiSettings />, label: "System Settings", path: "/systemsettings" },
        { type: 'separator', label: 'Entrance and Exit Monitoring' },
        ...baseItems,
        { type: 'separator', label: 'Employee Attendance Monitoring' },
        { icon: <FiBarChart2 />, label: "Lorem Ipsum", path: "/lorem1" },
        { icon: <FiBarChart2 />, label: "Lorem Ipsum", path: "/lorem2" },
      ];
    } else {
      return [
        { icon: <FiHome />, label: "Dashboard", path: "/dashboard" },
        { icon: <FiUsers />, label: "Student Management", path: "/students" },
        ...baseItems,
      ];
    }
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  const menuItems = getMenuItems();

  if (loading) {
    return (
      <div className="sidebar-loading">
        <div className="loading-spinner"></div>
      </div>
    );
  }

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
                {user.role === 'superadmin' 
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
          <div className="user-avatar">{getInitials(user.fullname)}</div>
          {isOpen && (
            <div className="user-details">
              <div className="user-name">{user.fullname || 'Admin User'}</div>
              <div className="user-role">{user.role || 'ADMIN'}</div>
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