import express from "express";
import cors from "cors";
import type { Router } from "express";

function lazyRouter(loadRouter: () => Promise<{ default: Router }>) {
  let routerPromise: Promise<Router> | null = null;

  return async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      if (!routerPromise) {
        routerPromise = loadRouter().then((module) => module.default);
      }

      const router = await routerPromise;
      return router(req, res, next);
    } catch (error) {
      return next(error);
    }
  };
}

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: "*",
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    })
  );

  app.use(express.json({ limit: "10mb" }));

  app.use("/api/auth", lazyRouter(() => import("./routes/auth")));
  app.use("/api", lazyRouter(() => import("./routes/chat")));
  app.use("/api", lazyRouter(() => import("./routes/interviewPrep")));
  app.use("/api", lazyRouter(() => import("./routes/tracker")));
  app.use("/api", lazyRouter(() => import("./routes/contact")));
  app.use("/api", lazyRouter(() => import("./routes/questionnaire")));
  app.use("/api", lazyRouter(() => import("./routes/payments")));

  app.get("/health", (req, res) => {
    res.json({ status: "healthy", time: new Date().toISOString() });
  });

  return app;
}
