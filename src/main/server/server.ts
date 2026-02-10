import express, { Request, Response, NextFunction } from "express";
import path from "path";
import fs from "fs";
import { Server } from "http";

export interface LocalServer {
  port: number;
  setProjectPath: (projectPath: string | null) => void;
  close: () => void;
}

/**
 * Local HTTP server for COG/raster files (Range requests supported).
 * Same approach as dronet: /files serves project root so fetch(http://127.0.0.1:port/files/relative/path) works.
 */
export function createServer(): LocalServer {
  const app = express();
  let currentProjectPath: string | null = null;

  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS, HEAD");
    res.setHeader("Access-Control-Allow-Headers", "Range");
    res.setHeader(
      "Access-Control-Expose-Headers",
      "Content-Range, Content-Length, Accept-Ranges"
    );
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    return next();
  });

  app.use("/files", (req: Request, res: Response, next: NextFunction) => {
    if (!currentProjectPath) {
      return res.status(404).send("Project path not set.");
    }
    const staticHandler = express.static(currentProjectPath, {
      acceptRanges: true,
      dotfiles: "ignore",
      fallthrough: false,
      setHeaders: (res) => {
        res.setHeader("Access-Control-Allow-Origin", "*");
      },
    });
    return staticHandler(req, res, next);
  });

  const server: Server = app.listen(0);
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Server address could not be obtained");
  }
  const port = address.port;
  console.log(`[rotgis] Raster server: http://127.0.0.1:${port}/files`);

  return {
    port,
    setProjectPath: (p: string | null) => {
      if (p) {
        const resolved = path.resolve(p);
        if (fs.existsSync(resolved)) {
          currentProjectPath = resolved;
        } else {
          currentProjectPath = null;
        }
      } else {
        currentProjectPath = null;
      }
    },
    close: () => server.close(),
  };
}
