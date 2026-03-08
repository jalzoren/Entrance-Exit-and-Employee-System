const express = require("express");
const cors = require("cors");
const timeRoute = require("./time");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/time", timeRoute);

module.exports = app;
