import * as fs from "fs";
import * as path from "path";
import { app } from "electron";

// better-sqlite3 native modülü lazy-load (import sırasında çökmesin, hata loglansın)
type DatabaseInstance = import("better-sqlite3").Database;
let db: DatabaseInstance | null = null;

export type DatabaseOperation = "get" | "all" | "run" | "exec";

export interface DatabaseQueryPayload {
  operation: DatabaseOperation;
  sql: string;
  params?: unknown[];
}

/**
 * Veritabanı dosyası yolu:
 * - Development: proje içinde src/repo/rotgis.db
 * - Production: AppData/repo/rotgis.db
 */
function getDatabasePath(): string {
  const isDev =
    process.env.NODE_ENV === "development" || !app.isPackaged;
  if (isDev) {
    return path.join(process.cwd(), "src", "repo", "rotgis.db");
  }
  return path.join(app.getPath("appData"), "repo", "rotgis.db");
}

/**
 * Models klasörünün yolu (.sql dosyaları)
 * Development: src/main/models, Production: dist/models (webpack ile kopyalanır)
 */
function getModelsDir(): string {
  const isDev =
    process.env.NODE_ENV === "development" || !app.isPackaged;
  if (isDev) {
    const fromCwd = path.join(process.cwd(), "src", "main", "models");
    if (fs.existsSync(fromCwd)) return fromCwd;
    const fromDirname = path.join(__dirname, "..", "main", "models");
    if (fs.existsSync(fromDirname)) return fromDirname;
    return fromCwd;
  }
  return path.join(__dirname, "models");
}

/**
 * _migrations tablosunu yoksa oluşturur (ilk çalıştırmada gerekli).
 */
function ensureMigrationsTable(database: DatabaseInstance): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      name TEXT PRIMARY KEY,
      executed_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
  `);
}

/**
 * Models klasöründeki tüm .sql dosyalarını isim sırasına göre okuyup çalıştırır.
 * _migrations tablosu varsa zaten çalıştırılmış dosyaları atlar.
 */
function runMigrations(database: DatabaseInstance): void {
  ensureMigrationsTable(database);

  const modelsDir = getModelsDir();
  if (!fs.existsSync(modelsDir)) {
    console.warn("[DatabaseService] Models directory not found:", modelsDir);
    return;
  }

  const files = fs
    .readdirSync(modelsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const migrationName = file;
    const stmt = database.prepare(
      "SELECT 1 FROM _migrations WHERE name = ?"
    );
    const existing = stmt.get(migrationName);
    if (existing) continue;

    const filePath = path.join(modelsDir, file);
    const sql = fs.readFileSync(filePath, "utf-8");
    const insertMigration = database.prepare(
      "INSERT OR IGNORE INTO _migrations (name) VALUES (?)"
    );

    try {
      database.exec(sql);
      insertMigration.run(migrationName);
      console.log("[DatabaseService] Migration applied:", migrationName);
    } catch (err) {
      console.error("[DatabaseService] Migration failed:", migrationName, err);
      throw err;
    }
  }
}

/**
 * Veritabanına bağlanır, migrations çalıştırır.
 * Uygulama açılırken bir kez çağrılmalı.
 */
export function initDatabase(): DatabaseInstance {
  if (db) return db;

  const dbPath = getDatabasePath();
  const dbDir = path.dirname(dbPath);

  console.log("[DatabaseService] initDatabase called");
  console.log("[DatabaseService] NODE_ENV:", process.env.NODE_ENV, "isPackaged:", app.isPackaged);
  console.log("[DatabaseService] DB path:", dbPath);
  console.log("[DatabaseService] process.cwd():", process.cwd());

  if (!fs.existsSync(dbDir)) {
    console.log("[DatabaseService] Creating directory:", dbDir);
    fs.mkdirSync(dbDir, { recursive: true });
  }

  let DatabaseConstructor: new (path: string) => DatabaseInstance;
  try {
    DatabaseConstructor = require("better-sqlite3") as new (
      path: string
    ) => DatabaseInstance;
  } catch (loadErr: unknown) {
    const msg = loadErr instanceof Error ? loadErr.message : String(loadErr);
    const stack = loadErr instanceof Error ? loadErr.stack : "";
    console.error("[DatabaseService] better-sqlite3 load failed:", msg, stack);
    throw loadErr;
  }

  let connection: DatabaseInstance;
  try {
    connection = new DatabaseConstructor(dbPath);
  } catch (openErr: unknown) {
    const msg = openErr instanceof Error ? openErr.message : String(openErr);
    const stack = openErr instanceof Error ? openErr.stack : "";
    console.error("[DatabaseService] Database open failed:", msg, stack);
    throw openErr;
  }

  connection.pragma("journal_mode = WAL");
  connection.pragma("foreign_keys = ON");

  try {
    runMigrations(connection);
  } catch (e) {
    connection.close();
    throw e;
  }

  db = connection;
  console.log("[DatabaseService] Database ready:", dbPath);
  return db;
}

/**
 * Veritabanı bağlantısını döndürür. Önce initDatabase() çağrılmış olmalı.
 */
export function getDatabase(): DatabaseInstance | null {
  return db;
}

/**
 * Veritabanı bağlantısını kapatır (uygulama kapanırken).
 */
export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
    console.log("[DatabaseService] Closed.");
  }
}

/**
 * IPC'den gelen isteği işler: get, all, run, exec.
 */
export function handleDatabaseQuery(payload: DatabaseQueryPayload): unknown {
  const database = getDatabase();
  if (!database) {
    throw new Error("Database not initialized. Call initDatabase() first.");
  }

  const { operation, sql, params = [] } = payload;
  const bound =
    params.length > 0
      ? database.prepare(sql).bind(...params)
      : database.prepare(sql);

  switch (operation) {
    case "get":
      return bound.get();
    case "all":
      return bound.all();
    case "run": {
      const result = bound.run();
      return {
        changes: result.changes,
        lastInsertRowid: result.lastInsertRowid,
      };
    }
    case "exec":
      database.exec(sql);
      return undefined;
    default:
      throw new Error(`Unknown database operation: ${operation}`);
  }
}
