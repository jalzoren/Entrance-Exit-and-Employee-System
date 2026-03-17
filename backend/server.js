require("dotenv").config();

const app = require("./src/app");

const loginRouter = require("./routes/login");
const forgotPasswordRouter = require("./routes/forgotPassword");
const registrationRoutes = require("./routes/registration");
const recognizeRoute = require("./routes/recognize");

const PORT = process.env.PORT || 5000;

// Routes
app.use("/api", loginRouter);
app.use("/api", forgotPasswordRouter);
app.use("/api", registrationRoutes);
app.use("/api", recognizeRoute);

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log("Forgot password endpoints ready");
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