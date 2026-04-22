// server.js
require("dotenv").config();

const app = require("./src/app");

const loginRouter = require("./routes/login");
const forgotPasswordRouter = require("./routes/forgotPassword");
const registrationRoutes = require("./routes/registration");
const importStudentsRouter = require("./routes/importStudents");
const addUserRouter = require("./routes/addUser");
const recognizeRoute = require("./routes/recognize");
const manualEntryRoute  = require('./routes/manualEntry');
const qrScanRoute       = require('./routes/qrScan');
const visitorRoute      = require('./routes/visitor');
const visitorExitRoute    = require('./routes/visitor-exit');
const programRoutes = require('./routes/programs');
const analyticsRoute = require('./routes/analytics');
const { router: timeRouter } = require('./src/time');
const settingsRoute = require('./routes/systemSettings');

const PORT = process.env.PORT || 5000;

app.use('/api', loginRouter);
app.use('/api', forgotPasswordRouter); 
app.use("/api", registrationRoutes);
app.use('/api', importStudentsRouter);
app.use('/api', addUserRouter); 
app.use("/api", recognizeRoute);
app.use('/api', programRoutes);
app.use('/api/time', timeRouter);
app.use('/api/analytics', analyticsRoute);
app.use('/api/settings', settingsRoute);

app.use('/api/manualentry', manualEntryRoute);
app.use('/api/qrscan', qrScanRoute);
app.use('/api/visitor', visitorRoute);
app.use('/api/visitor-exit', visitorExitRoute);

// Start server
app.listen(PORT, () => {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`🚀 [SERVER] Running on port ${PORT}`);
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('✅ API Routes mounted:');
  console.log('   GET /api/time                  → [Time Service]');
  console.log('   POST /api/login                → [Login]');
  console.log('   POST /api/register             → [Registration]');
  console.log('   GET /api/analytics/metrics     → [Dashboard Metrics]');
  console.log('   GET /api/analytics/traffic     → [Traffic Data]');
  console.log('   GET /api/analytics/college-distribution → [College Distribution]');
  console.log('   GET /api/analytics/departments → [Department Data]');
  console.log('   POST /api/manualentry          → [Manual Entry]');
  console.log('   POST /api/qrscan               → [QR Scan]');
  console.log('   POST /api/visitor              → [Visitor Entry]');
  console.log('   PUT /api/settings              → [System Settings]');
  console.log('═══════════════════════════════════════════════════════════════');
});
// .env file content (for reference):
// PORT=5000
// 
// DB_HOST=localhost
// DB_USER=root
// DB_PASSWORD=
// DB_NAME=eems
// DB_PORT=3306
// unicorn face_service:app --reload    uvicorn face_service:app --host 127.0.0.1 --port 8000