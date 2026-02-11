import express, { Request, Response, NextFunction } from "express";
import path from "path";
import fs from "fs";
import { Server } from "http";

export interface LocalServer {
  port: number;
  setProjectPath: (projectPath: string | null) => void;
  close: () => void;
}

const STREAM_HIGH_WATER_MARK = 256 * 1024;

/** LRU cache for range responses: tekrarlayan tile isteklerinde disk I/O azalır, UI donması azalır */
const CACHE_MAX_ENTRIES = 200;
const CACHE_MAX_BYTES = 32 * 1024 * 1024; // 32 MB

interface CacheEntry {
  buf: Buffer;
  bytes: number;
}
const rangeCache = new Map<string, CacheEntry>();
let cacheTotalBytes = 0;
const cacheKeys: string[] = [];

function cacheKey(filePath: string, start: number, end: number): string {
  return `${filePath}:${start}-${end}`;
}

function cacheGet(key: string): Buffer | null {
  const entry = rangeCache.get(key);
  if (!entry) return null;
  const idx = cacheKeys.indexOf(key);
  if (idx !== -1) {
    cacheKeys.splice(idx, 1);
    cacheKeys.push(key);
  }
  return entry.buf;
}

function cacheSet(key: string, buf: Buffer): void {
  const bytes = buf.length;
  while (cacheKeys.length >= CACHE_MAX_ENTRIES || (cacheTotalBytes + bytes > CACHE_MAX_BYTES && cacheKeys.length > 0)) {
    const evict = cacheKeys.shift();
    if (evict) {
      const e = rangeCache.get(evict);
      if (e) {
        cacheTotalBytes -= e.bytes;
        rangeCache.delete(evict);
      }
    }
  }
  cacheTotalBytes += bytes;
  rangeCache.set(key, { buf, bytes });
  cacheKeys.push(key);
}

function pipeWithErrorHandling(
  stream: fs.ReadStream,
  res: Response,
  onError: () => void
): Response {
  stream.on("error", () => {
    if (!res.headersSent) onError();
    stream.destroy();
    try {
      res.destroy();
    } catch {
      // ignore
    }
  });
  return stream.pipe(res);
}

/**
 * Yerel HTTP sunucusu: COG/raster dosyalarını tile-tile (Range) ile sunar.
 * Performans: LRU cache (tekrarlayan range istekleri memory'den), async read (event loop bloklamaz).
 * İleride: worker_threads ile decode/read worker pool eklenebilir (CPU spike azaltır).
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

  app.use("/files", async (req: Request, res: Response, next: NextFunction) => {
    if (!currentProjectPath) {
      return res.status(404).send("Project path not set.");
    }
    const relativePath = req.path.replace(/^\/+/, "").replace(/\.\./g, "");
    const filePath = path.join(currentProjectPath, relativePath);

    let stat: fs.Stats;
    try {
      stat = await fs.promises.stat(filePath);
    } catch {
      return res.status(404).send("File not found.");
    }
    if (!stat.isFile()) {
      return res.status(404).send("Not a file.");
    }

    const total = stat.size;
    const rangeHeader = req.headers.range;
    const isHead = req.method === "HEAD";

    const sendHeaders = (rangeStart?: number, rangeEnd?: number) => {
      if (rangeStart !== undefined && rangeEnd !== undefined) {
        res.status(206);
        res.setHeader("Content-Range", `bytes ${rangeStart}-${rangeEnd}/${total}`);
        res.setHeader("Content-Length", String(rangeEnd - rangeStart + 1));
      } else {
        res.setHeader("Content-Length", String(total));
      }
      res.setHeader("Accept-Ranges", "bytes");
    };

    if (isHead) {
      sendHeaders();
      return res.end();
    }

    const streamOpts: { highWaterMark: number; start?: number; end?: number } = {
      highWaterMark: STREAM_HIGH_WATER_MARK,
    };

    if (!rangeHeader) {
      sendHeaders();
      const stream = fs.createReadStream(filePath, streamOpts);
      return pipeWithErrorHandling(stream, res, () =>
        res.status(500).send("Read error")
      );
    }

    const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);
    if (!match) {
      return res.status(416).send("Invalid Range");
    }

    const start = parseInt(match[1], 10);
    let end = match[2] ? parseInt(match[2], 10) : total - 1;
    if (end >= total) end = total - 1;

    sendHeaders(start, end);

    const key = cacheKey(filePath, start, end);
    const cached = cacheGet(key);
    if (cached && cached.length === end - start + 1) {
      return res.send(cached);
    }

    const len = end - start + 1;
    const buf = Buffer.alloc(len);
    try {
      const fd = await fs.promises.open(filePath, "r");
      await fd.read(buf, 0, len, start);
      await fd.close();
      if (len <= 2 * 1024 * 1024) cacheSet(key, buf);
      return res.send(buf);
    } catch (readErr) {
      return res.status(500).send("Read error");
    }
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
