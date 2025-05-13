import express from "express";
import next from "next";
import mongoose from "mongoose";
import dotenv from "dotenv";
// import Config from "./config";
import config from "./config.ts";
//const{request, response } = express
dotenv.config();

const dev = config.nodeEnv !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();
const server = express();
const port = config.port;
//"start": "next start",
//"dev": "next dev --turbopack",
// MongoDB connection
mongoose
  .connect(config.mongodbUri)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });

// Body parsing middleware
server.use((req, res, next) => {
  if (req.url.startsWith("/api/") || req.url.startsWith("/files/")) {
    // Skip body parsing for API routes
    return next();
  }
  express.json()(req, res, next);
});
server.use((req, res, next) => {
  if (req.url.startsWith("/api/") || req.url.startsWith("/files/")) {
    return next();
  }
  express.urlencoded({ extended: true })(req, res, next);
});

// Prepare Next.js
app
  .prepare()
  .then(() => {
    server.get("/", (_, response) => {
      response.json({ message: "Hello from Express!" });
    });

    // Catch-all route for Next.js pages
    server.all(/(.*)/, (req, res) => {
      console.log(`Handling request: ${req.url}`); // Debug logging
      return handle(req, res);
    });

    // Start server
    server.listen(port, () => {
      console.log(`> Ready on http://localhost:${port}`);
      //console.log("NextAuthUrl: ", config.nextAuthUrl);
    });
  })
  .catch((err) => {
    console.error("Next.js preparation error:", err);
    process.exit(1);
  });
