import { useState, useRef, useEffect } from "react";
import "../css/Login.css";
import logo from "../assets/logo2.png";
import { LuScanFace } from "react-icons/lu";
import { useNavigate, Link } from "react-router-dom";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import Swal from 'sweetalert2';
import { useAuth } from "../context/AuthContext";
import { useLogContext } from "../context/LogContext";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { login } = useAuth();

  const toggleShowPassword = () => setShowPassword((prev) => !prev);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    const result = await login(email, password);

    if (result.success) {
      await Swal.fire({
        icon: 'success',
        title: 'Login Successful!',
        text: `Welcome back!`,
        timer: 1500,
        showConfirmButton: false
      });
      
      // Redirect based on role
      navigate(result.redirect);
    } else {
      Swal.fire({
        icon: 'error',
        title: 'Login Failed',
        text: result.message || 'Invalid email or password',
      });
    }
    
    setLoading(false);
  };

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
          <h1 className="logintext">LOG IN</h1>
        </div>

        <div className="login-card">
          <form className="login-form" onSubmit={handleLogin}>
            <div className="input-group">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                placeholder="example@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="input-group">
              <label htmlFor="password">Password</label>
              <div className="password-input-wrapper">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
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
              className="login-button"
              disabled={loading}
            >
              {loading ? 'LOGGING IN...' : 'LOGIN'}
            </button>
          </form>

          <div className="form-footer">
            <div className="footer-links">
              <Link to="/forgotpass" className="forgot-password-link">
                Forgot Password?
              </Link>
              <Link to="/facerecog" className="face-recognition-link">
                Use Face Recognition
              </Link>
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