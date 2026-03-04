const express = require("express");
const { getMetrics } = require("../controllers/metricsController");

const router = express.Router();

router.get("/metrics", getMetrics);

module.exports = { metricsRouter: router };
