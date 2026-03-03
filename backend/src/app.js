const express = require("express");
const cors = require("cors");
const timeRoute = require("./time");

const app = express();

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

app.use("/api/time", timeRoute);

module.exports = app;
