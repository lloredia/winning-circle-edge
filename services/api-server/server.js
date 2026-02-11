const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3001;
const DATA_DIR = process.env.DATA_DIR || "/app/data";

app.use(cors());
app.use(express.json());

// Get today's date in YYYY-MM-DD format (UTC)
function todayStr() {
  return new Date().toISOString().split("T")[0];
}

// GET /api/picks/today — returns today's generated picks
app.get("/api/picks/today", (req, res) => {
  const today = todayStr();
  const filePath = path.join(DATA_DIR, "picks", `${today}.json`);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({
      error: "No picks generated yet today",
      date: today,
      hint: "Run the pipeline: python3 generate_picks.py",
    });
  }

  const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  res.json(data);
});

// GET /api/picks/:date — returns picks for a specific date
app.get("/api/picks/:date", (req, res) => {
  const date = req.params.date;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: "Invalid date format. Use YYYY-MM-DD" });
  }

  const filePath = path.join(DATA_DIR, "picks", `${date}.json`);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: `No picks found for ${date}` });
  }

  const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  res.json(data);
});

// GET /api/odds/today — returns today's raw odds
app.get("/api/odds/today", (req, res) => {
  const today = todayStr();
  const filePath = path.join(DATA_DIR, "odds", `${today}.json`);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "No odds fetched yet today", date: today });
  }

  const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  res.json(data);
});

// GET /api/history — list all available pick dates
app.get("/api/history", (req, res) => {
  const historyDir = path.join(DATA_DIR, "history");

  if (!fs.existsSync(historyDir)) {
    return res.json({ dates: [] });
  }

  const files = fs.readdirSync(historyDir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(".json", ""))
    .sort()
    .reverse();

  res.json({ dates: files, total: files.length });
});

// GET /api/health — health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "Winning Circle × UNDERDOG EDGE™ API",
    date: todayStr(),
    uptime: process.uptime(),
  });
});

app.listen(PORT, () => {
  console.log(`🔥 Winning Circle API running on port ${PORT}`);
  console.log(`📂 Data directory: ${DATA_DIR}`);
  console.log(`📡 Endpoints:`);
  console.log(`   GET /api/picks/today`);
  console.log(`   GET /api/picks/:date`);
  console.log(`   GET /api/odds/today`);
  console.log(`   GET /api/history`);
  console.log(`   GET /api/health`);
});
