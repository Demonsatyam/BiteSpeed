const express = require("express");

const app = express();

app.use(express.json());

app.get("/", (req, res) => {
  res.send("Bitespeed Identity Reconciliation API");
});

module.exports = app;