import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
console.log("Initializing database...");
const db = new Database("memory.db");
console.log("Database initialized.");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    role TEXT,
    content TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

app.use(express.json());

// Debug Middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// API Routes
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

app.get("/api/messages", (req, res) => {
  try {
    const messages = db.prepare("SELECT * FROM messages ORDER BY timestamp ASC").all();
    res.json(messages);
  } catch (err) {
    console.error("DB Error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

app.post("/api/messages", (req, res) => {
  const { id, role, content } = req.body;
  const insert = db.prepare("INSERT INTO messages (id, role, content) VALUES (?, ?, ?)");
  insert.run(id, role, content);
  res.json({ status: "ok" });
});

app.delete("/api/messages", (req, res) => {
  db.prepare("DELETE FROM messages").run();
  res.json({ status: "cleared" });
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      root: path.join(__dirname, '..', 'client'),
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "..", "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "..", "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
