import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function runMigrations() {
  const sqlPath = path.join(__dirname, '..', 'sql', 'schema.sql');
  const sql = await fs.readFile(sqlPath, 'utf8');
  await pool.query(sql);
}
