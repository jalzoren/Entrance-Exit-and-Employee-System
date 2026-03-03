import React, { useState, useEffect } from "react";
import { Link, NavLink } from "react-router-dom";
import {
  FiHome,
  FiMonitor,
  FiFileText,
  FiUsers,
  FiBarChart2,
  FiMenu,
} from "react-icons/fi";

import "../componentscss/Sidebar.css";

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(true);
  const [user, setUser] = useState({ fullname: 'Loading...', role: 'ADMIN' });

  useEffect(() => {
    // Get user info from localStorage when component mounts
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const toggleSidebar = () => setIsOpen((prev) => !prev);

  const menuItems = [
    { icon: <FiHome />, label: "Dashboard", path: "/dashboard" },
    { icon: <FiMonitor />, label: "Real-Time Monitor", path: "/monitor" },
    { icon: <FiFileText />, label: "Entry-Exit Records", path: "/records" },
    { icon: <FiUsers />, label: "Student Management", path: "/students" },
    { icon: <FiBarChart2 />, label: "Analytics & Reports", path: "/analytics" },
  ];

  // Get initials for avatar
  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

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
              <img
                src="../logo3.png"
                alt="Logo"
                className="brand-image"
              />
              <h1 className="brand-title">Entrance and Exit</h1>
              <p className="brand-subtitle">Monitoring System</p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {menuItems.map((item) => (
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
          ))}
        </nav>

        {/* User profile - NOW DYNAMIC */}
        <div className="sidebar-user">
          <div className="user-avatar">{getInitials(user.fullname)}</div>
          {isOpen && (
            <div className="user-details">
              <div className="user-name">{user.fullname || 'Admin User'}</div>
              <div className="user-role">EEMS - {user.role || 'ADMIN'}</div>
              <Link to="/" className="profile-link">
                Logout
              </Link> 
            </div>
          )}
        </div>
      </aside>
    </>
  );
}