import fs from 'fs';
import path from 'path';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import Database from 'better-sqlite3';
import { nanoid } from 'nanoid';

const PORT = process.env.PORT || 4100;
const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'gmao.db');

fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(DB_PATH);

const ensureTables = () => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE,
      role TEXT,
      phone TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS locations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      parent_id TEXT,
      path TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      icon TEXT,
      description TEXT
    );
    CREATE TABLE IF NOT EXISTS equipment_types (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT
    );
    CREATE TABLE IF NOT EXISTS suppliers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      color TEXT,
      contact TEXT,
      phone TEXT,
      email TEXT
    );
    CREATE TABLE IF NOT EXISTS equipments (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      status TEXT DEFAULT 'online',
      critical INTEGER DEFAULT 0,
      description TEXT,
      location_id TEXT,
      category_id TEXT,
      type_id TEXT,
      manufacturer TEXT,
      model TEXT,
      serial TEXT,
      qr_code TEXT,
      supplier_id TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS teams (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      color TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS team_members (
      id TEXT PRIMARY KEY,
      team_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      role TEXT DEFAULT 'member',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS team_locations (
      id TEXT PRIMARY KEY,
      team_id TEXT NOT NULL,
      location_id TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS team_equipments (
      id TEXT PRIMARY KEY,
      team_id TEXT NOT NULL,
      equipment_id TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS files (
      id TEXT PRIMARY KEY,
      equipment_id TEXT,
      supplier_id TEXT,
      url TEXT,
      label TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);
};

ensureTables();

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(morgan('dev'));

const wrap = (fn) => (req, res, next) => {
  try {
    fn(req, res, next);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

const listAll = (table) => db.prepare(`SELECT * FROM ${table}`).all();
const getById = (table, id) => db.prepare(`SELECT * FROM ${table} WHERE id=?`).get(id);
const removeById = (table, id) => db.prepare(`DELETE FROM ${table} WHERE id=?`).run(id);

const upsert = (table, payload, id) => {
  const columns = Object.keys(payload);
  const placeholders = columns.map(() => '?').join(',');
  const assignments = columns.map(col => `${col}=?`).join(',');
  if (id && getById(table, id)) {
    db.prepare(`UPDATE ${table} SET ${assignments}, updated_at=CURRENT_TIMESTAMP WHERE id=?`).run(...columns.map(c => payload[c]), id);
    return id;
  }
  const newId = id || nanoid();
  db.prepare(`INSERT INTO ${table} (${['id', ...columns].join(',')}) VALUES (${['?', ...columns.map(() => '?')].join(',')})`).run(newId, ...columns.map(c => payload[c]));
  return newId;
};

const registerCrud = (base, table) => {
  app.get(`/api/${base}`, wrap((req, res) => {
    res.json(listAll(table));
  }));

  app.get(`/api/${base}/:id`, wrap((req, res) => {
    const item = getById(table, req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json(item);
  }));

  app.post(`/api/${base}`, wrap((req, res) => {
    const id = upsert(table, req.body, req.body.id);
    res.status(201).json(getById(table, id));
  }));

  app.put(`/api/${base}/:id`, wrap((req, res) => {
    const id = upsert(table, req.body, req.params.id);
    res.json(getById(table, id));
  }));

  app.delete(`/api/${base}/:id`, wrap((req, res) => {
    removeById(table, req.params.id);
    res.json({ ok: true });
  }));
};

registerCrud('users', 'users');
registerCrud('locations', 'locations');
registerCrud('categories', 'categories');
registerCrud('types', 'equipment_types');
registerCrud('suppliers', 'suppliers');
registerCrud('equipments', 'equipments');
registerCrud('teams', 'teams');
registerCrud('team_members', 'team_members');
registerCrud('team_locations', 'team_locations');
registerCrud('team_equipments', 'team_equipments');

app.get('/api/health', (req, res) => res.json({ ok: true, db: DB_PATH }));

app.listen(PORT, () => {
  console.log(`[GMAO API] listening on ${PORT}, db at ${DB_PATH}`);
});
