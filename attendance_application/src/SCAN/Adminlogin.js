import { useState, useEffect } from "react";
import { login as loginApi, requestPasswordReset, resetPasswordWithOtp } from "../api";
import LandingPage from "./LandingPage";
import AdminDashboard from "../ADMIN/AdminDashboard";

const ScanIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 6 23 1 18 1" /><line x1="23" y1="1" x2="16" y2="8" />
    <polyline points="1 6 1 1 6 1" /><line x1="1" y1="1" x2="8" y2="8" />
    <polyline points="23 18 23 23 18 23" /><line x1="23" y1="23" x2="16" y2="16" />
    <polyline points="1 18 1 23 6 23" /><line x1="1" y1="23" x2="8" y2="16" />
  </svg>
);

const EyeIcon = ({ open }) => open ? (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
  </svg>
) : (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

const FaceIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="5" /><path d="M3 21c0-4.418 4.03-8 9-8s9 3.582 9 8" />
    <circle cx="9.5" cy="7" r="0.5" fill="currentColor"/><circle cx="14.5" cy="7" r="0.5" fill="currentColor"/>
    <path d="M9.5 10.5s.833 1 2.5 1 2.5-1 2.5-1"/>
  </svg>
);

const ArrowLeftIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
  </svg>
);

const MailIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="2,4 12,13 22,4"/>
  </svg>
);

// ── Keys shared with Settingspage ──────────────────────────────────────────
const LOGO_KEY = 'plp_logo';
const NAME_KEY = 'institution_name';

export default function LoginPage() {
  const [time, setTime] = useState(new Date());
  
  // ── Branding (logo + name) ─────────────────────────────────────────────
  const [branding, setBranding] = useState({
    logo: localStorage.getItem(LOGO_KEY) || null,
    name: localStorage.getItem(NAME_KEY) || 'Attendance Management System'
  });

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const [scanLine, setScanLine] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");

  const [view, setView] = useState("login");
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetShake, setResetShake] = useState(false);
  const [otp, setOtp] = useState("");
  const [newPass, setNewPass] = useState("");
  const [newPass2, setNewPass2] = useState("");

  const [showLanding, setShowLanding] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false); // ── NEW: navigate to AdminDashboard

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const s = setInterval(() => setScanLine(p => (p + 1) % 100), 30);
    return () => clearInterval(s);
  }, []);

  const formatTime = (d) => {
    let h = d.getHours(), m = d.getMinutes(), s = d.getSeconds();
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")} ${ampm}`;
  };

  const formatDate = (d) => d.toLocaleDateString("en-US", { weekday:"long", year:"numeric", month:"long", day:"numeric" });

  const handleLogin = async () => {
    if (!username || !password) {
      setErrorMsg("Please enter both username and password.");
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }
    try {
      setLoading(true);
      const res = await loginApi({ username: username.trim(), password: password.trim() });
      if (res && res.success) {
        setErrorMsg("");
        setShowAdmin(true);
      } else {
        setErrorMsg(res?.message || "Invalid username or password.");
        setShake(true);
        setTimeout(() => setShake(false), 500);
      }
    } catch (e) {
      setErrorMsg(e?.message || "Login failed");
      setShake(true);
      setTimeout(() => setShake(false), 500);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!resetEmail) {
      setResetShake(true);
      setTimeout(() => setResetShake(false), 500);
      return;
    }
    try {
      setResetLoading(true);
      const res = await requestPasswordReset({ email: resetEmail.trim() });
      if (res && res.success) {
        setErrorMsg("");
        setView("otp");
      } else {
        setErrorMsg(res?.message || "Failed to send OTP");
        setResetShake(true);
        setTimeout(() => setResetShake(false), 500);
      }
    } catch (e) {
      setErrorMsg(e?.message || "Failed to send OTP");
      setResetShake(true);
      setTimeout(() => setResetShake(false), 500);
    } finally {
      setResetLoading(false);
    }
  };

  const handleResetConfirm = async () => {
    if (!otp || !newPass || !newPass2) {
      setErrorMsg("Please complete all fields.");
      setResetShake(true);
      setTimeout(() => setResetShake(false), 500);
      return;
    }
    if (newPass !== newPass2) {
      setErrorMsg("Passwords do not match.");
      setResetShake(true);
      setTimeout(() => setResetShake(false), 500);
      return;
    }
    try {
      setResetLoading(true);
      const res = await resetPasswordWithOtp({ email: resetEmail.trim(), otp: otp.trim(), new_password: newPass });
      if (res && res.success) {
        setErrorMsg("");
        setOtp("");
        setNewPass("");
        setNewPass2("");
        setView("forgot-sent");
      } else {
        setErrorMsg(res?.message || "Reset failed");
        setResetShake(true);
        setTimeout(() => setResetShake(false), 500);
      }
    } catch (e) {
      setErrorMsg(e?.message || "Reset failed");
      setResetShake(true);
      setTimeout(() => setResetShake(false), 500);
    } finally {
      setResetLoading(false);
    }
  };

  // ── Navigate to LandingPage (Employee Scanner) ──
  if (showLanding) return <LandingPage onNavigateAdmin={() => { setShowLanding(false); setShowAdmin(false); }} />;

  // ── Navigate to AdminDashboard ──
  if (showAdmin) return <AdminDashboard onLogout={() => { setShowAdmin(false); setView("login"); setUsername(""); setPassword(""); setErrorMsg(""); }} />;

  // Logo sizes
  const LOGO_SIZE = 100;
  const LEFT_LOGO_SIZE = 116;
  const LOGO_OFFSET = Math.max(LOGO_SIZE, LEFT_LOGO_SIZE);
  // Top bar height
  const BAR_HEIGHT = 60;
  const LOGO_TOP = BAR_HEIGHT - LOGO_SIZE / 2;
  const LEFT_LOGO_TOP = BAR_HEIGHT - LEFT_LOGO_SIZE / 2;

  return (
    <div style={{ width:"100vw", height:"100vh", overflow:"hidden", position:"relative", fontFamily:"'Segoe UI', sans-serif" }}>
      <style>{`
        @keyframes shake {
          0%,100%{transform:translateX(0)}
          20%{transform:translateX(-8px)} 40%{transform:translateX(8px)}
          60%{transform:translateX(-5px)} 80%{transform:translateX(5px)}
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Page background */}
      <div style={{
        position:"absolute",
        inset:0,
        background:"linear-gradient(160deg, rgba(6,35,22,0.72) 0%, rgba(21,92,54,0.55) 100%), url('https://images.unsplash.com/photo-1568992687947-868a62a9f521?w=1920') center/cover fixed no-repeat",
        backgroundColor:"#0d3a22"
      }}/>
      <div style={{ position:"absolute", inset:0, background:"repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px)" }}/>

      {/* Top bar */}
      <div style={{
        position:"absolute", top:0, left:0, right:0, height:BAR_HEIGHT,
        background:"linear-gradient(90deg, #0d4a20 0%, #1a6e35 50%, #0d4a20 100%)",
        display:"flex", alignItems:"center", justifyContent:"center",
        boxShadow:"0 2px 20px rgba(0,0,0,0.4)", zIndex:10
      }}>
        <span style={{ color:"#e8f5e0", letterSpacing:"0.25em", fontSize:13, fontWeight:600, textTransform:"uppercase" }}>
          {branding.name}
        </span>
      </div>

      {/* Institution Logo */}
      <div style={{ position:"absolute", top:LEFT_LOGO_TOP, left:20, zIndex:20 }}>
        {branding.logo ? (
          <img src={branding.logo} alt="Institution Logo" style={{
            width:LEFT_LOGO_SIZE, height:LEFT_LOGO_SIZE, borderRadius:"50%", objectFit:"cover",
            border:"3px solid #f0c040", boxShadow:"0 4px 20px rgba(0,0,0,0.6)"
          }}/>
        ) : (
          <img src="/LOGO.png" alt="Default Logo" style={{
            width:LEFT_LOGO_SIZE, height:LEFT_LOGO_SIZE, borderRadius:"50%", objectFit:"cover",
            border:"3px solid #f0c040", boxShadow:"0 4px 20px rgba(0,0,0,0.6)"
          }}/>
        )}
      </div>

      {/* Removed secondary logo as per request */}

      {/* Center card */}
      <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", paddingTop: BAR_HEIGHT + LOGO_OFFSET / 2 + 10, zIndex:5 }}>
        <div style={{
          display:"flex", width:"min(860px,90vw)", height:"min(420px,65vh)",
          borderRadius:20, overflow:"hidden", boxShadow:"0 25px 80px rgba(0,0,0,0.55)"
        }}>

          {/* Left panel */}
          <div style={{ flex:"0 0 46%", position:"relative", overflow:"hidden", borderRight:"1px solid rgba(255,255,255,0.08)" }}>
            <div style={{ position:"absolute", inset:0, backgroundImage:"url('/ADMIN%20BG.jpg')", backgroundSize:"cover", backgroundPosition:"center" }}/>
            <div style={{ position:"absolute", inset:0, background:"linear-gradient(160deg, rgba(10,60,25,0.82) 0%, rgba(20,80,35,0.88) 100%)" }}/>
            <div style={{ position:"absolute", left:0, right:0, height:2, background:"linear-gradient(90deg, transparent, rgba(100,255,150,0.6), transparent)", top:`${scanLine}%`, transition:"top 0.03s linear", boxShadow:"0 0 12px rgba(100,255,150,0.5)", zIndex:2 }}/>
            {/* Corner brackets */}
            <div style={{ position:"absolute", top:16, left:16, width:28, height:28, borderTop:"2px solid rgba(100,220,140,0.6)", borderLeft:"2px solid rgba(100,220,140,0.6)", zIndex:2 }}/>
            <div style={{ position:"absolute", top:16, right:16, width:28, height:28, borderTop:"2px solid rgba(100,220,140,0.6)", borderRight:"2px solid rgba(100,220,140,0.6)", zIndex:2 }}/>
            <div style={{ position:"absolute", bottom:16, left:16, width:28, height:28, borderBottom:"2px solid rgba(100,220,140,0.6)", borderLeft:"2px solid rgba(100,220,140,0.6)", zIndex:2 }}/>
            <div style={{ position:"absolute", bottom:16, right:16, width:28, height:28, borderBottom:"2px solid rgba(100,220,140,0.6)", borderRight:"2px solid rgba(100,220,140,0.6)", zIndex:2 }}/>
            <div style={{ position:"relative", zIndex:2, height:"100%", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"36px 28px" }}>
              <div style={{ width:72, height:72, borderRadius:"50%", background:"rgba(255,255,255,0.08)", border:"2px solid rgba(100,220,140,0.4)", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:20, color:"rgba(150,255,180,0.9)", position:"relative" }}>
                <FaceIcon />
                <svg width="72" height="72" style={{ position:"absolute" }} viewBox="0 0 72 72">
                  <circle cx="36" cy="36" r="34" fill="none" stroke="rgba(100,255,150,0.3)" strokeWidth="1" strokeDasharray="4 4"/>
                </svg>
              </div>
              <div style={{ background:"rgba(100,200,130,0.15)", border:"1px solid rgba(100,200,130,0.3)", borderRadius:4, padding:"3px 12px", marginBottom:10 }}>
                <span style={{ color:"#88eea8", fontSize:11, letterSpacing:"0.15em", fontWeight:600 }}>FACE RECOGNITION PORTAL</span>
              </div>
              <h2 style={{ color:"white", fontSize:26, fontWeight:800, textAlign:"center", margin:"0 0 6px", lineHeight:1.2, textShadow:"0 2px 10px rgba(0,0,0,0.5)" }}>
                {branding.name}
              </h2>
              <div style={{ width:40, height:2, background:"linear-gradient(90deg,transparent,#5de88a,transparent)", margin:"14px 0" }}/>
              <div style={{ background:"rgba(0,0,0,0.35)", borderRadius:12, padding:"10px 20px", border:"1px solid rgba(255,255,255,0.1)", textAlign:"center" }}>
                <div style={{ color:"white", fontSize:28, fontWeight:700, fontFamily:"'Courier New',monospace", letterSpacing:1 }}>{formatTime(time)}</div>
                <div style={{ color:"rgba(200,240,210,0.8)", fontSize:12, marginTop:3 }}>{formatDate(time)}</div>
              </div>
            </div>
          </div>

          {/* Right panel */}
          <div style={{ flex:"0 0 54%", background:"rgba(252,253,250,0.97)", backdropFilter:"blur(20px)", display:"flex", alignItems:"center", justifyContent:"center", overflowY:"auto" }}>
            <div style={{ width:"100%", maxWidth:360, padding:"0 40px", boxSizing:"border-box" }}>

              {/* ── LOGIN VIEW ── */}
              {view === "login" && (
                <div style={{ animation:"fadeSlideIn 0.3s ease" }}>
                  <div style={{ marginBottom:28 }}>
                    <h1 style={{ fontSize:30, fontWeight:800, color:"#0d2e15", margin:"0 0 4px", letterSpacing:"-0.5px" }}>Log In</h1>
                    <p style={{ color:"#7a9a85", fontSize:13, margin:0, display:"flex", alignItems:"center", gap:6 }}>
                      <span style={{ display:"inline-block", width:8, height:8, borderRadius:"50%", background:"#2da84a", boxShadow:"0 0 6px #2da84a" }}/>
                      Admin access only
                    </p>
                  </div>

                  <div style={{ animation: shake ? "shake 0.4s ease" : "none" }}>
                    <label style={{ display:"block", fontSize:11, fontWeight:700, color:"#4a6a55", letterSpacing:"0.12em", marginBottom:6 }}>USERNAME</label>
                    <div style={{ position:"relative", marginBottom:18 }}>
                      <input
                        type="text"
                        placeholder="e.g. 230000123"
                        value={username}
                        onChange={e => { setUsername(e.target.value); setErrorMsg(""); }}
                        onKeyDown={e => e.key === "Enter" && handleLogin()}
                        style={{ width:"100%", padding:"12px 16px", borderRadius:10, border:"1.5px solid #d0e0d5", fontSize:14, outline:"none", background:"#f6fbf7", color:"#0d2e15", boxSizing:"border-box", transition:"border 0.2s" }}
                        onFocus={e => e.target.style.border = "1.5px solid #2da84a"}
                        onBlur={e => e.target.style.border = "1.5px solid #d0e0d5"}
                      />
                    </div>

                    <label style={{ display:"block", fontSize:11, fontWeight:700, color:"#4a6a55", letterSpacing:"0.12em", marginBottom:6 }}>PASSWORD</label>
                    <div style={{ position:"relative", marginBottom: errorMsg ? 10 : 26 }}>
                      <input
                        type={showPass ? "text" : "password"}
                        placeholder="Enter password"
                        value={password}
                        onChange={e => { setPassword(e.target.value); setErrorMsg(""); }}
                        onKeyDown={e => e.key === "Enter" && handleLogin()}
                        style={{ width:"100%", padding:"12px 44px 12px 16px", borderRadius:10, border:`1.5px solid ${errorMsg ? "#e05555" : "#d0e0d5"}`, fontSize:14, outline:"none", background:"#f6fbf7", color:"#0d2e15", boxSizing:"border-box", transition:"border 0.2s" }}
                        onFocus={e => e.target.style.border = `1.5px solid ${errorMsg ? "#e05555" : "#2da84a"}`}
                        onBlur={e => e.target.style.border = `1.5px solid ${errorMsg ? "#e05555" : "#d0e0d5"}`}
                      />
                      <button onClick={() => setShowPass(p => !p)} style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", color:"#8aaa95", padding:4 }}>
                        <EyeIcon open={showPass}/>
                      </button>
                    </div>

                    {/* ── Error message ── */}
                    {errorMsg && (
                      <div style={{
                        display:"flex", alignItems:"center", gap:6,
                        background:"#fff0f0", border:"1px solid #f5c0c0",
                        borderRadius:8, padding:"8px 12px", marginBottom:16
                      }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d94444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                        </svg>
                        <span style={{ color:"#c03030", fontSize:12, fontWeight:500 }}>{errorMsg}</span>
                      </div>
                    )}

                    <button onClick={handleLogin} style={{
                      width:"100%", padding:"13px", borderRadius:10, border:"none",
                      background: loading ? "#7fca9a" : "linear-gradient(135deg, #1a8a3a 0%, #2dc856 100%)",
                      color:"white", fontSize:15, fontWeight:700, cursor: loading ? "default" : "pointer",
                      display:"flex", alignItems:"center", justifyContent:"center", gap:8,
                      boxShadow:"0 4px 16px rgba(30,160,70,0.35)", transition:"all 0.2s", letterSpacing:"0.02em"
                    }}
                      onMouseOver={e => { if (!loading) { e.currentTarget.style.transform="translateY(-1px)"; e.currentTarget.style.boxShadow="0 6px 20px rgba(30,160,70,0.45)"; }}}
                      onMouseOut={e => { e.currentTarget.style.transform=""; e.currentTarget.style.boxShadow="0 4px 16px rgba(30,160,70,0.35)"; }}
                    >
                      {loading ? (
                        <><span style={{ width:16, height:16, border:"2px solid rgba(255,255,255,0.4)", borderTopColor:"white", borderRadius:"50%", display:"inline-block", animation:"spin 0.7s linear infinite" }}/> Authenticating...</>
                      ) : (
                        <><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg> Log In</>
                      )}
                    </button>
                  </div>

                  <div style={{ textAlign:"center", marginTop:16 }}>
                    <button onClick={() => setView("forgot")} style={{ background:"none", border:"none", color:"#8aaa95", fontSize:13, cursor:"pointer", transition:"color 0.2s" }}
                      onMouseOver={e => e.currentTarget.style.color = "#1a8a3a"}
                      onMouseOut={e => e.currentTarget.style.color = "#8aaa95"}
                    >Forgot Password?</button>
                  </div>
                </div>
              )}

              {/* ── FORGOT PASSWORD VIEW ── */}
              {view === "forgot" && (
                <div style={{ animation:"fadeSlideIn 0.3s ease" }}>
                  <button onClick={() => setView("login")} style={{
                    display:"flex", alignItems:"center", gap:6, background:"none", border:"none",
                    color:"#7a9a85", fontSize:13, cursor:"pointer", padding:0, marginBottom:20,
                    transition:"color 0.2s"
                  }}
                    onMouseOver={e => e.currentTarget.style.color = "#1a8a3a"}
                    onMouseOut={e => e.currentTarget.style.color = "#7a9a85"}
                  >
                    <ArrowLeftIcon /> Back to Login
                  </button>

                  <div style={{ marginBottom:24 }}>
                    <h1 style={{ fontSize:26, fontWeight:800, color:"#0d2e15", margin:"0 0 6px", letterSpacing:"-0.5px" }}>Forgot Password?</h1>
                    <p style={{ color:"#7a9a85", fontSize:13, margin:0, lineHeight:1.5 }}>
                      Enter your admin email address and we'll send you a link to reset your password.
                    </p>
                  </div>

                  <div style={{ animation: resetShake ? "shake 0.4s ease" : "none" }}>
                    <label style={{ display:"block", fontSize:11, fontWeight:700, color:"#4a6a55", letterSpacing:"0.12em", marginBottom:6 }}>EMAIL ADDRESS</label>
                    <div style={{ position:"relative", marginBottom:24 }}>
                      <div style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", color:"#8aaa95" }}>
                        <MailIcon />
                      </div>
                      <input type="email" placeholder="Enter your email" value={resetEmail} onChange={e => setResetEmail(e.target.value)}
                        style={{ width:"100%", padding:"12px 16px 12px 44px", borderRadius:10, border:"1.5px solid #d0e0d5", fontSize:14, outline:"none", background:"#f6fbf7", color:"#0d2e15", boxSizing:"border-box", transition:"border 0.2s" }}
                        onFocus={e => e.target.style.border = "1.5px solid #2da84a"}
                        onBlur={e => e.target.style.border = "1.5px solid #d0e0d5"}
                        onKeyDown={e => e.key === "Enter" && handleReset()}
                      />
                    </div>

                    <button onClick={handleReset} style={{
                      width:"100%", padding:"13px", borderRadius:10, border:"none",
                      background: resetLoading ? "#7fca9a" : "linear-gradient(135deg, #1a8a3a 0%, #2dc856 100%)",
                      color:"white", fontSize:15, fontWeight:700, cursor: resetLoading ? "default" : "pointer",
                      display:"flex", alignItems:"center", justifyContent:"center", gap:8,
                      boxShadow:"0 4px 16px rgba(30,160,70,0.35)", transition:"all 0.2s", letterSpacing:"0.02em"
                    }}
                      onMouseOver={e => { if (!resetLoading) { e.currentTarget.style.transform="translateY(-1px)"; e.currentTarget.style.boxShadow="0 6px 20px rgba(30,160,70,0.45)"; }}}
                      onMouseOut={e => { e.currentTarget.style.transform=""; e.currentTarget.style.boxShadow="0 4px 16px rgba(30,160,70,0.35)"; }}
                    >
                      {resetLoading ? (
                        <><span style={{ width:16, height:16, border:"2px solid rgba(255,255,255,0.4)", borderTopColor:"white", borderRadius:"50%", display:"inline-block", animation:"spin 0.7s linear infinite" }}/> Sending...</>
                      ) : (
                        <><MailIcon /> Send Reset Link</>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* ── EMAIL SENT CONFIRMATION VIEW ── */}
              {view === "otp" && (
                <div style={{ animation:"fadeSlideIn 0.3s ease" }}>
                  <button onClick={() => setView("forgot")} style={{
                    display:"flex", alignItems:"center", gap:6, background:"none", border:"none",
                    color:"#7a9a85", fontSize:13, cursor:"pointer", padding:0, marginBottom:20,
                    transition:"color 0.2s"
                  }}
                    onMouseOver={e => e.currentTarget.style.color = "#1a8a3a"}
                    onMouseOut={e => e.currentTarget.style.color = "#7a9a85"}
                  >
                    <ArrowLeftIcon /> Back
                  </button>

                  <div style={{ marginBottom:24 }}>
                    <h1 style={{ fontSize:26, fontWeight:800, color:"#0d2e15", margin:"0 0 6px", letterSpacing:"-0.5px" }}>Enter OTP</h1>
                    <p style={{ color:"#7a9a85", fontSize:13, margin:0, lineHeight:1.5 }}>
                      We sent a 6‑digit code to {resetEmail}. Enter it and set a new password.
                    </p>
                  </div>

                  <div style={{ animation: resetShake ? "shake 0.4s ease" : "none" }}>
                    <label style={{ display:"block", fontSize:11, fontWeight:700, color:"#4a6a55", letterSpacing:"0.12em", marginBottom:6 }}>OTP CODE</label>
                    <div style={{ position:"relative", marginBottom:16 }}>
                      <input type="text" placeholder="6-digit code" value={otp}
                        onChange={e => { setOtp(e.target.value); setErrorMsg(""); }}
                        style={{ width:"100%", padding:"12px 16px", borderRadius:10, border:"1.5px solid #d0e0d5", fontSize:14, outline:"none", background:"#f6fbf7", color:"#0d2e15", boxSizing:"border-box", transition:"border 0.2s" }}
                        onFocus={e => e.target.style.border = "1.5px solid #2da84a"}
                        onBlur={e => e.target.style.border = "1.5px solid #d0e0d5"}
                      />
                    </div>

                    <label style={{ display:"block", fontSize:11, fontWeight:700, color:"#4a6a55", letterSpacing:"0.12em", marginBottom:6 }}>NEW PASSWORD</label>
                    <div style={{ position:"relative", marginBottom:16 }}>
                      <input type="password" placeholder="New password" value={newPass}
                        onChange={e => { setNewPass(e.target.value); setErrorMsg(""); }}
                        style={{ width:"100%", padding:"12px 16px", borderRadius:10, border:"1.5px solid #d0e0d5", fontSize:14, outline:"none", background:"#f6fbf7", color:"#0d2e15", boxSizing:"border-box", transition:"border 0.2s" }}
                        onFocus={e => e.target.style.border = "1.5px solid #2da84a"}
                        onBlur={e => e.target.style.border = "1.5px solid #d0e0d5"}
                      />
                    </div>

                    <label style={{ display:"block", fontSize:11, fontWeight:700, color:"#4a6a55", letterSpacing:"0.12em", marginBottom:6 }}>CONFIRM PASSWORD</label>
                    <div style={{ position:"relative", marginBottom: errorMsg ? 10 : 26 }}>
                      <input type="password" placeholder="Confirm new password" value={newPass2}
                        onChange={e => { setNewPass2(e.target.value); setErrorMsg(""); }}
                        style={{ width:"100%", padding:"12px 16px", borderRadius:10, border:"1.5px solid #d0e0d5", fontSize:14, outline:"none", background:"#f6fbf7", color:"#0d2e15", boxSizing:"border-box", transition:"border 0.2s" }}
                        onFocus={e => e.target.style.border = "1.5px solid #2da84a"}
                        onBlur={e => e.target.style.border = "1.5px solid #d0e0d5"}
                      />
                    </div>

                    {errorMsg && (
                      <div style={{
                        display:"flex", alignItems:"center", gap:6,
                        background:"#fff0f0", border:"1px solid #f5c0c0",
                        borderRadius:8, padding:"8px 12px", marginBottom:16
                      }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d94444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                        </svg>
                        <span style={{ color:"#c03030", fontSize:12, fontWeight:500 }}>{errorMsg}</span>
                      </div>
                    )}

                    <button onClick={handleResetConfirm} style={{
                      width:"100%", padding:"13px", borderRadius:10, border:"none",
                      background: resetLoading ? "#7fca9a" : "linear-gradient(135deg, #1a8a3a 0%, #2dc856 100%)",
                      color:"white", fontSize:15, fontWeight:700, cursor: resetLoading ? "default" : "pointer",
                      display:"flex", alignItems:"center", justifyContent:"center", gap:8,
                      boxShadow:"0 4px 16px rgba(30,160,70,0.35)", transition:"all 0.2s", letterSpacing:"0.02em"
                    }}
                      onMouseOver={e => { if (!resetLoading) { e.currentTarget.style.transform="translateY(-1px)"; e.currentTarget.style.boxShadow="0 6px 20px rgba(30,160,70,0.45)"; }}}
                      onMouseOut={e => { e.currentTarget.style.transform=""; e.currentTarget.style.boxShadow="0 4px 16px rgba(30,160,70,0.35)"; }}
                    >
                      {resetLoading ? "Processing..." : "Confirm Reset"}
                    </button>
                  </div>
                </div>
              )}

              {/* ── EMAIL SENT CONFIRMATION VIEW ── */}
              {view === "forgot-sent" && (
                <div style={{ animation:"fadeSlideIn 0.3s ease", textAlign:"center" }}>
                  <div style={{
                    width:72, height:72, borderRadius:"50%",
                    background:"linear-gradient(135deg, #e8f8ee, #c8efd8)",
                    border:"2px solid #2da84a",
                    display:"flex", alignItems:"center", justifyContent:"center",
                    margin:"0 auto 20px", color:"#1a8a3a"
                  }}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  </div>
                  <h1 style={{ fontSize:24, fontWeight:800, color:"#0d2e15", margin:"0 0 10px" }}>Check Your Email</h1>
                  <p style={{ color:"#7a9a85", fontSize:13, lineHeight:1.6, margin:"0 0 28px" }}>
                    A password reset link has been sent to<br/>
                    <strong style={{ color:"#0d2e15" }}>{resetEmail}</strong>.<br/>
                    Please check your inbox.
                  </p>
                  <button onClick={() => { setView("login"); setResetEmail(""); }} style={{
                    width:"100%", padding:"13px", borderRadius:10, border:"none",
                    background:"linear-gradient(135deg, #1a8a3a 0%, #2dc856 100%)",
                    color:"white", fontSize:15, fontWeight:700, cursor:"pointer",
                    display:"flex", alignItems:"center", justifyContent:"center", gap:8,
                    boxShadow:"0 4px 16px rgba(30,160,70,0.35)", transition:"all 0.2s"
                  }}
                    onMouseOver={e => { e.currentTarget.style.transform="translateY(-1px)"; e.currentTarget.style.boxShadow="0 6px 20px rgba(30,160,70,0.45)"; }}
                    onMouseOut={e => { e.currentTarget.style.transform=""; e.currentTarget.style.boxShadow="0 4px 16px rgba(30,160,70,0.35)"; }}
                  >
                    Back to Login
                  </button>
                </div>
              )}

            </div>
          </div>

        </div>
      </div>

      {/* Back to Scanner — bottom left */}
      <div style={{ position:"absolute", bottom:46, left:24, zIndex:20 }}>
        <button
          onClick={() => setShowLanding(true)}
          style={{
            display:"flex", alignItems:"center", gap:7,
            background:"rgba(255,255,255,0.12)", backdropFilter:"blur(10px)",
            border:"1px solid rgba(255,255,255,0.25)", borderRadius:24,
            color:"white", fontSize:13, padding:"9px 20px", cursor:"pointer",
            transition:"all 0.2s", fontWeight:500
          }}
          onMouseOver={e => e.currentTarget.style.background = "rgba(255,255,255,0.22)"}
          onMouseOut={e => e.currentTarget.style.background = "rgba(255,255,255,0.12)"}
        >
          <ScanIcon /> Back to Scanner
        </button>
      </div>

      {/* Bottom watermark */}
      <div style={{ position:"absolute", bottom:14, left:0, right:0, textAlign:"center", zIndex:5 }}>
        <span style={{ color:"rgba(255,255,255,0.4)", fontSize:11, letterSpacing:"0.1em" }}>
          © 2026 Attendance Management System · Face Recognition Portal
        </span>
      </div>
    </div>
  );
}
