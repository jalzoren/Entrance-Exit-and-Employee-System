import { useState } from "react";
import "../css/Login.css";
import logo from "../assets/logo2.png";
import { LuScanFace } from "react-icons/lu";
import { useNavigate, Link } from "react-router-dom";
import { FaEye, FaEyeSlash } from "react-icons/fa"; // Add this import
import Swal from 'sweetalert2';

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false); // Add this state
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const toggleShowPassword = () => setShowPassword((prev) => !prev); // Add this function

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('http://localhost:5000/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email: email,
          password: password 
        })
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem('user', JSON.stringify(data.user));
        
        await Swal.fire({
          icon: 'success',
          title: 'Login Successful!',
          text: `Welcome back, ${data.user.fullname || data.user.email}!`,
          timer: 1500,
          showConfirmButton: false
        });
        
        navigate("/dashboard");
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Login Failed',
          text: data.message || 'Invalid email or password',
        });
      }
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Connection Error',
        text: 'Cannot connect to server. Please try again.',
      });
    } finally {
      setLoading(false);
    }
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

            <div className="input-group password-container">
              <label htmlFor="password">Password</label>
              <div className="password-input-wrapper"> {/* Add wrapper div */}
                <input
                  id="password"
                  type={showPassword ? "text" : "password"} // Toggle type
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
            <Link to="/forgotpass" className="forgot-password-link">
              Forgot Password?
            </Link>
            <Link to="/facerecog" className="register-link">
              Go to Face Recognition
            </Link>
            
            <p className="footer-text">
              ENTRANCE AND EXIT MONITORING SYSTEM
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}