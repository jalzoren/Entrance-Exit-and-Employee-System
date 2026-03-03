require("dotenv").config();
const app = require("./src/app");
const loginRouter = require("./routes/login");
const forgotPasswordRouter = require("./routes/forgotPassword"); // Add this
const registrationRoutes = require("./routes/registration");

const PORT = process.env.PORT || 5000;

app.use('/api', loginRouter);
app.use('/api', forgotPasswordRouter); // Add this line
app.use("/api", registrationRoutes);


app.listen(PORT, () => {
  console.log(`Backend runnichghfng on port http://localhost:${PORT}`);
  console.log(`Login endpoint: http://localhost:${PORT}/api/login`);
  console.log(`Forgot password endpoints ready`);
});
// .env file content (for reference):
// PORT=5000
// 
// DB_HOST=localhost
// DB_USER=root
// DB_PASSWORD=
// DB_NAME=eems
// DB_PORT=3306