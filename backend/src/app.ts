import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth";
import chatRoutes from "./routes/chat";
import interviewPrepRoutes from "./routes/interviewPrep";
import trackerRoutes from "./routes/tracker";

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: "*",
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    })
  );

  app.use(express.json({ limit: "10mb" }));

  app.use("/api/auth", authRoutes);
  app.use("/api", chatRoutes);
  app.use("/api", interviewPrepRoutes);
  app.use("/api", trackerRoutes);

  app.get("/health", (req, res) => {
    res.json({ status: "healthy", time: new Date().toISOString() });
  });

  return app;
}
