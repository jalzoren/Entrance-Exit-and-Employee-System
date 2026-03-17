# Entrance and Exit Monitoring PLP Students

**An Integrated Smart Entrance, Exit, and Attendance Monitoring System with Data Analytics for Institutional Decision Support at Pamantasan ng Lungsod ng Pasig**

---

## Project Overview

This project aims to design and develop a **secure desktop-based smart entrance and exit monitoring system** that records student attendance using multi-modal authentication and provides **analytical insights** to support administrative decision-making at Pamantasan ng Lungsod ng Pasig (PLP).

The system enhances campus security, automates attendance tracking, and supports data-driven administrative decisions.

---

## Project Objectives

**General Objective:**
- Develop a secure system to monitor student entrance and exit while providing analytics for institutional decision-making.

**Specific Objectives:**
1. Record student entrance and exit logs in real-time.
2. Enhance campus security through verified identity authentication.
3. Automatically track student attendance using digital identification methods.
4. Store and manage attendance data in a **centralized and secure database**.
5. Generate **daily, monthly, and yearly analytical reports**.
6. Support data-driven administrative decisions via dashboards and trend analysis.

---

## System Functionality

### User Roles

**Administrator**
- Manage student records.
- View and export attendance logs.
- Access analytics dashboard.
- Manage system configurations.
- View authentication logs.

**Student** *(no direct interface)*
- Authenticate identity using:
  - Face recognition (Primary)
  - Student ID typing (Primary)
  - QR Code scanning (Optional)
  - Voice input (Optional)

---

### Functional Requirements

**Student Authentication**
- Facial recognition.
- Manual ID input.
- Determines Time-In or Time-Out automatically.
- Rejects invalid or duplicate authentication attempts.
- Records:
  - Student ID
  - Student Name (Last, First, M.I.)
  - Timestamp (DD/MM/YYYY)
  - Entry or Exit
  - Authentication Method (Facial Recognition, Manual Input)

**Admin Functions**
- View attendance logs.
- Filter logs by:
  - Date range
  - Student
  - Department (optional)
- Export reports (CSV / PDF)
- View analytics dashboard.
- View authentication attempts (success/failure).

---

## Unique & Innovative Features

1. **Multi-Modal Student Authentication**
   - Facial Recognition
   - Manual Student ID Entry (Keyboard)
   - QR Code Recognition (Optional)
   - Voice Input (Optional)
2. **Automated Real-Time Entry and Exit Tracking**
3. **Built-in Data Analytics** for institutional decision support
4. **Security-Driven Design**
   - Logs all authentication attempts (successful or failed)
   - Maintains immutable entry and exit records
   - Supports audit trails for investigations or compliance reviews

**Future Enhancements**
- Monitoring of guest and visitors.

---

## System Design & Implementation

**Frontend:**  
- React (Vite) with JSX for UI  
- Electron.js for Desktop Application  

**Backend:**  
- Python + Node.js  

**Database:**  
- MySQL

**Wireframe/Prototype:**  
- To be developed (visual representation of UI and dashboards).

---

## Scope and Limitations

**Scope**
- Only for enrolled PLP students.
- Desktop-based application.
- Records:
  - Time-In and Time-Out
  - Method of Authentication (Facial Recognition, Manual Input, QR Code)
  - Timestamp (DD/MM/YYYY)
- Includes admin dashboard and analytics.
- Uses biometric (facial recognition) and non-biometric authentication methods.

**Limitations**
- Requires a camera and keyboard.
- Facial recognition accuracy depends on lighting and camera quality.

---

## Contributors

- **[MIAH](https://github.com/jerimiahbitancor)** – Project Lead & UI Designer 
- **[JAL](https://github.com/jalzoren)** – Frontend Developer & UI Designer 
- **[KAIZEN](https://github.com/ka1zen3)** – Backend & Data Analytics Specialisy
- **[LYNN](https://github.com/LynnCzyla)** – Backend & Database Developer  
- **[NEIL](https://github.com/mortred-crtcl))** – Frontend Developer  


---




Entrance-and-Exit-Monitoring-PLP-Students
├─ backend
│  ├─ .env
│  ├─ eems.sql
│  ├─ package-lock.json
│  ├─ package.json
│  ├─ routes
│  │  ├─ forgotPassword.js
│  │  ├─ importStudents.js
│  │  ├─ login.js
│  │  └─ registration.js
│  ├─ server.js
│  └─ src
│     ├─ app.js
│     ├─ db.js
│     └─ time.js
├─ plp-student-monitoring
│  ├─ eslint.config.js
│  ├─ index.html
│  ├─ main.cjs
│  ├─ package-lock.json
│  ├─ package.json
│  ├─ public
│  │  ├─ logo3.png
│  │  ├─ logoplp.gif
│  │  └─ vite.svg
│  ├─ README.md
│  ├─ src
│  │  ├─ App.css
│  │  ├─ App.jsx
│  │  ├─ assets
│  │  │  ├─ logo2.png
│  │  │  ├─ MAIN.png
│  │  │  └─ react.svg
│  │  ├─ components
│  │  │  ├─ AddUser.jsx
│  │  │  ├─ DashboardLayout.jsx
│  │  │  ├─ GenerateReportFilter.jsx
│  │  │  ├─ ImportStudents.jsx
│  │  │  ├─ RegisterStudent.jsx
│  │  │  ├─ RegisterStudentCam.jsx
│  │  │  ├─ Sidebar.jsx
│  │  │  ├─ SuperDashboardLayout.jsx
│  │  │  └─ SuperSidebar.jsx
│  │  ├─ componentscss
│  │  │  ├─ AddUser.css
│  │  │  ├─ DashboardLayout.css
│  │  │  ├─ GenerateReportFilter.css
│  │  │  ├─ ImportStudents.css
│  │  │  ├─ RegisterStudent.css
│  │  │  ├─ RegisterStudentCam.css
│  │  │  └─ Sidebar.css
│  │  ├─ css
│  │  │  ├─ Analytics.css
│  │  │  ├─ Dashboard.css
│  │  │  ├─ FaceRecognition.css
│  │  │  ├─ ForgotPass.css
│  │  │  ├─ Login.css
│  │  │  ├─ Monitor.css
│  │  │  ├─ RealTimeMonitor.css
│  │  │  ├─ Records.css
│  │  │  ├─ Students.css
│  │  │  ├─ SystemSettings.css
│  │  │  └─ Users.css
│  │  ├─ index.css
│  │  ├─ layouts
│  │  ├─ main.jsx
│  │  ├─ pages
│  │  │  ├─ About.jsx
│  │  │  ├─ adminpages
│  │  │  │  ├─ Analytics.jsx
│  │  │  │  ├─ Dashboard.jsx
│  │  │  │  ├─ Monitor.jsx
│  │  │  │  ├─ Records.jsx
│  │  │  │  └─ Students.jsx
│  │  │  ├─ FaceRecognition.jsx
│  │  │  ├─ ForgotPass.jsx
│  │  │  ├─ ForgotPass2.jsx
│  │  │  ├─ Login.jsx
│  │  │  └─ superadminpages
│  │  │     ├─ SuperDashboard.jsx
│  │  │     ├─ SuperStudents.jsx
│  │  │     ├─ SystemSettings.jsx
│  │  │     └─ Users.jsx
│  │  └─ utils
│  └─ vite.config.js
├