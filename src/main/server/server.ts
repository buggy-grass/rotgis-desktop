import express, { Request, Response, NextFunction } from "express";
import path from "path";
import fs from "fs";
import { Server } from "http";

export interface LocalServer {
  port: number;
  setProjectPath: (path: string | null) => void;
  close: () => void;
}

export function createServer(): LocalServer {
  const app = express();
  let currentProjectPath: string | null = null;

  // CORS
  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
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

  // COG-safe file streaming
  app.use("/files", (req: Request, res: Response) => {
    if (!currentProjectPath) {
      return res.status(404).send("Proje seçilmedi.");
    }

    const filePath = path.join(currentProjectPath, req.path);

    if (!fs.existsSync(filePath)) {
      return res.status(404).send("Dosya bulunamadı.");
    }

    const stat = fs.statSync(filePath);
    const total = stat.size;

    // HEAD request support
    if (req.method === "HEAD") {
      res.set({
        "Accept-Ranges": "bytes",
        "Content-Length": total,
      });
      return res.end();
    }

    const range = req.headers.range;

    // Range zorunlu (COG için)
    if (!range) {
      return res
        .status(416)
        .set({
          "Accept-Ranges": "bytes",
        })
        .end();
    }

    const match = range.match(/bytes=(\d+)-(\d*)/);

    if (!match) {
      return res.status(416).send("Invalid Range");
    }

    const start = parseInt(match[1], 10);
    let end = match[2] ? parseInt(match[2], 10) : total - 1;

    if (start >= total) {
      return res.status(416).send("Range Not Satisfiable");
    }

    if (end >= total) end = total - 1;

    const chunkSize = end - start + 1;

    res.writeHead(206, {
      "Content-Range": `bytes ${start}-${end}/${total}`,
      "Accept-Ranges": "bytes",
      "Content-Length": chunkSize,
      "Content-Type": "image/tiff",
    });

    const stream = fs.createReadStream(filePath, { start, end });

    stream.on("error", (err) => {
      console.error("Stream error:", err);
      res.end();
    });

    return stream.pipe(res);
  });

  // Random port
  const server: Server = app.listen(0);

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Server address alınamadı");
  }

  const port = address.port;
  console.error(`Local server running at http://localhost:${port}`);

  return {
    port,
    setProjectPath: (p: string | null) => {
      if (p) {
        const resolved = path.resolve(p);
        if (fs.existsSync(resolved)) {
          currentProjectPath = resolved;
          console.error("Sunucu yolu güncellendi:", currentProjectPath);
        } else {
          console.error("Geçersiz proje yolu:", resolved);
        }
      } else {
        currentProjectPath = null;
      }
    },
    close: () => server.close(),
  };
}
