const express = require("express");
const identifyRoute = require("./routes/identify");

const app = express();

app.use(express.json());

app.use("/identify", identifyRoute);

app.get("/", (req, res) => {
  res.send("Bitespeed Identity Reconciliation API");
});

module.exports = app;