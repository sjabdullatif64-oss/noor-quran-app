import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));

// Keep older native builds working if they were built with an API base that
// already included `/api` and consequently requested `/api/api/...`.
// The normal client path remains `/api/...`; this compatibility mount is
// protected by the same route middleware and can be removed after old builds
// have aged out.
app.use("/api/api", router);
app.use("/api", router);

export default app;
