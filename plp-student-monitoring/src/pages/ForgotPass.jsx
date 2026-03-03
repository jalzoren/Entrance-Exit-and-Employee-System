import { useState } from "react";
import "../css/ForgotPass.css";
import logo from "../assets/logo2.png";
import { LuScanFace } from "react-icons/lu";
import { useNavigate } from "react-router-dom";
import Swal from 'sweetalert2';

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const navigate = useNavigate();

  const handleSendCode = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('http://localhost:5000/api/forgot-password/send-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email })
      });

      const data = await response.json();

      if (data.success) {
        setCodeSent(true);
        Swal.fire({
          icon: 'success',
          title: 'Code Sent!',
          text: 'Check your email for the verification code',
          timer: 2000,
          showConfirmButton: false
        });
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
        text: 'Cannot connect to server'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('http://localhost:5000/api/forgot-password/verify-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, code })
      });

      const data = await response.json();

      if (data.success) {
        // Show success alert FIRST and wait for it to complete before navigating
        await Swal.fire({
          icon: 'success',
          title: 'Code Verified!',
          text: 'Redirecting to reset password...',
          timer: 1500,
          showConfirmButton: false,
          willClose: () => {
            // Navigate AFTER the alert closes
            navigate('/forgotpass2', { state: { email, code } });
          }
        });
      } else {
        // Show error alert (this stays on the same page)
        Swal.fire({
          icon: 'error',
          title: 'Invalid Code',
          text: data.message || 'The verification code is incorrect'
        });
      }
    } catch (error) {
      console.error('Verification error:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Verification failed. Please try again.'
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

      <div className="login-content">
        <div className="logined">
          <img src={logo} alt="Logo" className="login-icon" />
          <div className="login-header">
            <h1 className="logintext">FORGOT PASSWORD</h1>
          </div>
        </div>

        <div className="login-box">
          <form className="login-form" onSubmit={codeSent ? handleVerifyCode : handleSendCode}>
            <div className="input-group">
              <label htmlFor="email">Email</label>
              <div className="input-group-row">
                <input
                  id="email"
                  className="email-input"
                  type="email"
                  placeholder="example@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={codeSent || loading}
                />
                {!codeSent && (
                  <button
                    type="button"
                    className="send-code-button"
                    onClick={handleSendCode}
                    disabled={loading}
                  >
                    {loading ? 'Sending...' : 'Send'}
                  </button>
                )}
              </div>
            </div>

            {codeSent && (
              <div className="input-group">
                <label htmlFor="code">Verification Code</label>
                <input
                  id="code"
                  type="text"
                  placeholder="Enter 6-digit code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                  maxLength="6"
                  disabled={loading}
                />
              </div>
            )}

            {codeSent && (
              <button 
                type="submit" 
                className="submit-button"
                disabled={loading}
              >
                {loading ? 'Verifying...' : 'VERIFY CODE'}
              </button>
            )}
          </form>

          <button type="button" className="back-to-home">
            <a href="/">← Back to Login</a>
          </button>
          <p className="footer-text">
            ENTRANCE AND EXIT MONITORING SYSTEM
          </p>
        </div>
      </div>
    </div>
  );
}