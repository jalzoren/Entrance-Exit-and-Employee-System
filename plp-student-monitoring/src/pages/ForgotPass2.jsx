import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "../css/ForgotPass.css";
import logo from "../assets/logo2.png";
import { LuScanFace } from "react-icons/lu";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import Swal from 'sweetalert2';

export default function ForgotPasswordStep2() {
  const location = useLocation();
  const navigate = useNavigate();
  const { email, code } = location.state || {};

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleResetPassword = async (e) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      Swal.fire({
        icon: 'error',
        title: 'Password Mismatch',
        text: 'Passwords do not match!'
      });
      return;
    }

    if (newPassword.length < 6) {
      Swal.fire({
        icon: 'error',
        title: 'Weak Password',
        text: 'Password must be at least 6 characters'
      });
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('http://localhost:5000/api/forgot-password/reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email, 
          code, 
          newPassword 
        })
      });

      const data = await response.json();

      if (data.success) {
        await Swal.fire({
          icon: 'success',
          title: 'Success!',
          text: 'Your password has been reset successfully',
          timer: 2000,
          showConfirmButton: false
        });
        navigate('/');
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: data.message
        });
      }
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Connection Error',
        text: 'Failed to reset password'
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleShowPassword = () => setShowPassword((prev) => !prev);

  if (!email || !code) {
    navigate('/forgotpass');
    return null;
  }

  return (
    <div className="login-container">
      <LuScanFace
        title="Go To Entry-Exit Students"
        className="top-left-icon"
        onClick={() => navigate("/facerecog")}
      />

      <div className="login-wrapper">
        <div className="login-header-container">
          <img src={logo} alt="System Logo" className="login-icon" />
          <h1 className="logintext">RESET PASSWORD</h1>
        </div>

        <div className="login-card">
          <form className="login-form" onSubmit={handleResetPassword}>
            <div className="input-group">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                disabled
                className="disabled-input"
              />
            </div>

            <div className="input-group">
              <label htmlFor="newPassword">New Password</label>
              <div className="password-input-wrapper">
                <input
                  id="newPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="•••••••• (min. 6 characters)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength="6"
                  disabled={loading}
                />
                <button
                  type="button"
                  className="show-password-btn"
                  onClick={toggleShowPassword}
                  tabIndex="-1"
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </div>

            <div className="input-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <div className="password-input-wrapper">
                <input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength="6"
                  disabled={loading}
                />
                <button
                  type="button"
                  className="show-password-btn"
                  onClick={toggleShowPassword}
                  tabIndex="-1"
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </div>

            <button 
              type="submit" 
              className="submit-button"
              disabled={loading || !newPassword || !confirmPassword}
            >
              {loading ? 'RESETTING...' : 'RESET PASSWORD'}
            </button>
          </form>

        // Replace the footer section with:
<div className="form-footer">
  <div className="footer-links">
    <button type="button" className="back-to-login-link">
      <a href="/">← Back to Login</a>
    </button>
  </div>
  <p className="footer-text">
    ENTRANCE AND EXIT MONITORING SYSTEM
  </p>
</div>
        </div>
      </div>
    </div>
  );
}