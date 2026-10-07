import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiHome, FiSettings, FiLogOut } from 'react-icons/fi';
import './Header.css';

const Header = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    // TODO: Implement logout logic
    navigate('/login');
  };

  return (
    <header className="app-header">
      <div className="header-container">
        <div className="header-left">
          <Link to="/" className="logo">
            <h1>IMPACT</h1>
          </Link>
        </div>
        
        <nav className="header-nav">
          <Link to="/dashboard/admin" className="nav-link">
            Dashboard
          </Link>
          <Link to="/doc-dashboard" className="nav-link">
            Documents
          </Link>
          <Link to="/reports" className="nav-link">
            Reports
          </Link>
        </nav>

        <div className="header-right">
          <button className="header-btn" title="Settings">
            <FiSettings />
          </button>
          <button className="header-btn" onClick={handleLogout} title="Logout">
            <FiLogOut />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
