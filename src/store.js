import fs from 'node:fs';
import path from 'node:path';

const DATA_DIR = path.resolve('data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const initial = { users: [], apiKeys: [], projects: [], services: [], deployments: [], files: [], tasks: [], audit: [], usage: [], repos: [], datasetListings: [] };

export function loadDb() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2));
  try { return { ...initial, ...JSON.parse(fs.readFileSync(DB_FILE, 'utf8')) }; }
  catch { throw new Error('data/db.json is invalid; restore a backup or remove it to initialize a fresh database.'); }
}
let db = loadDb();
export function getDb() { return db; }
export function saveDb() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = DB_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, DB_FILE);
}
export function resetDbForTests() { db = structuredClone(initial); saveDb(); }
