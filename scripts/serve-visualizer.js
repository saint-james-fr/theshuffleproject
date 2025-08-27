#!/usr/bin/env node

import http from "http";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = 3001;

// MIME types for different file extensions
const mimeTypes = {
  ".html": "text/html",
  ".json": "application/json",
  ".css": "text/css",
  ".js": "application/javascript",
};

const server = http.createServer((req, res) => {
  // Enable CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(200);
    res.end();
    return;
  }

  let filePath = "";

  if (req.url === "/" || req.url === "/index.html") {
    filePath = path.join(__dirname, "cluster-visualizer.html");
  } else if (req.url === "/advanced-clusters.json") {
    filePath = path.join(__dirname, "..", "advanced-clusters.json");
  } else {
    res.writeHead(404);
    res.end("Not found");
    return;
  }

  // Check if file exists
  if (!fs.existsSync(filePath)) {
    res.writeHead(404);
    res.end("File not found");
    return;
  }

  // Get file extension for MIME type
  const ext = path.extname(filePath);
  const contentType = mimeTypes[ext] || "text/plain";

  try {
    const content = fs.readFileSync(filePath);
    res.writeHead(200, { "Content-Type": contentType });
    res.end(content);
  } catch (error) {
    res.writeHead(500);
    res.end("Server error");
  }
});

server.listen(PORT, () => {
  console.log("\n🎵 Video Clustering Visualizer");
  console.log("==========================================");
  console.log(`🌐 Server running at: http://localhost:${PORT}`);
  console.log("📊 Interactive visualization with filters and search");
  console.log("🎯 Click on video titles to open them on YouTube");
  console.log("\nPress Ctrl+C to stop the server");

  // Try to open browser automatically
  const url = `http://localhost:${PORT}`;
  try {
    const platform = process.platform;
    if (platform === "darwin") {
      execSync(`open "${url}"`);
    } else if (platform === "win32") {
      execSync(`start "${url}"`);
    } else {
      execSync(`xdg-open "${url}"`);
    }
    console.log("🚀 Opening browser automatically...");
  } catch (error) {
    console.log(`📱 Manually open: ${url}`);
  }
});

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("\n👋 Shutting down server...");
  server.close(() => {
    console.log("✅ Server stopped");
    process.exit(0);
  });
});
