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
const programRoutes = require('./routes/programs');

const PORT = process.env.PORT || 5000;

app.use('/api', loginRouter);
app.use('/api', forgotPasswordRouter); 
app.use("/api", registrationRoutes);
app.use('/api', importStudentsRouter);
app.use('/api', addUserRouter); 
app.use("/api", recognizeRoute);
app.use('/api', programRoutes);

app.use('/api/manualentry', manualEntryRoute);
app.use('/api/qrscan', qrScanRoute);
app.use('/api/visitor', visitorRoute);

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
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