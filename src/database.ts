import initSqlJs from 'sql.js';
import type { Database } from 'sql.js';
import sqlWasmUrl from 'sql.js/dist/sql-wasm.wasm?url';

let db: Database | null = null;
let initialized = false;
const DB_NAME = 'inventario_mipyme.db';

// Initialize SQLite database
export async function initDatabase(): Promise<void> {
  if (initialized) return;

  const SQL = await initSqlJs({
    locateFile: (file: string) => {
      if (file.endsWith('.wasm')) {
        // sqlWasmUrl already includes the base path from Vite config
        return sqlWasmUrl;
      }
      return file;
    }
  });

  // Try to load existing database from OPFS
  const existingData = await loadFromOPFS();
  
  if (existingData) {
    db = new SQL.Database(existingData);
  } else {
    db = new SQL.Database();
    createTables();
    seedData();
    await saveToOPFS();
  }

  initialized = true;
}

// Create all tables
function createTables(): void {
  if (!db) return;

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'vendedor')),
      full_name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS providers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      contact TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      email TEXT DEFAULT '',
      address TEXT DEFAULT '',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      cost_price REAL NOT NULL DEFAULT 0,
      sale_price REAL NOT NULL DEFAULT 0,
      stock INTEGER NOT NULL DEFAULT 0,
      min_stock INTEGER NOT NULL DEFAULT 5,
      provider_id TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (provider_id) REFERENCES providers(id)
    );

    CREATE TABLE IF NOT EXISTS purchases (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      provider_id TEXT,
      total_cost REAL NOT NULL DEFAULT 0,
      notes TEXT DEFAULT '',
      FOREIGN KEY (provider_id) REFERENCES providers(id)
    );

    CREATE TABLE IF NOT EXISTS purchase_items (
      id TEXT PRIMARY KEY,
      purchase_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      cost_price REAL NOT NULL,
      FOREIGN KEY (purchase_id) REFERENCES purchases(id),
      FOREIGN KEY (product_id) REFERENCES products(id)
    );

    CREATE TABLE IF NOT EXISTS sales (
      id TEXT PRIMARY KEY,
      invoice_number INTEGER NOT NULL,
      date TEXT NOT NULL,
      seller_id TEXT,
      subtotal REAL NOT NULL DEFAULT 0,
      total REAL NOT NULL DEFAULT 0,
      payment_method TEXT DEFAULT 'Efectivo',
      notes TEXT DEFAULT '',
      FOREIGN KEY (seller_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS sale_items (
      id TEXT PRIMARY KEY,
      sale_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      product_name TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      total REAL NOT NULL,
      FOREIGN KEY (sale_id) REFERENCES sales(id),
      FOREIGN KEY (product_id) REFERENCES products(id)
    );

    CREATE TABLE IF NOT EXISTS config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
}

// Seed initial data
function seedData(): void {
  if (!db) return;

  // Default admin user (password: admin123)
  const adminHash = simpleHash('admin123');
  const vendedorHash = simpleHash('vendedor123');

  db.run(`INSERT OR IGNORE INTO users (id, username, password_hash, role, full_name) 
    VALUES (?, ?, ?, ?, ?)`,
    ['admin-001', 'admin', adminHash, 'admin', 'Administrador Principal']);

  db.run(`INSERT OR IGNORE INTO users (id, username, password_hash, role, full_name) 
    VALUES (?, ?, ?, ?, ?)`,
    ['vendedor-001', 'vendedor', vendedorHash, 'vendedor', 'Vendedor Demo']);

  // Default provider
  db.run(`INSERT OR IGNORE INTO providers (id, name, contact, phone, email, address, created_at) 
    VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ['prov-001', 'Proveedor General', 'Juan Pérez', '+53 5000 0001', 'proveedor@demo.cu', 'La Habana, Cuba', new Date().toISOString()]);

  // Sample products
  const products = [
    { code: 'P001', name: 'Arroz (5kg)', category: 'Alimentos', cost: 150, sale: 220, stock: 45, min: 10 },
    { code: 'P002', name: 'Aceite (1L)', category: 'Alimentos', cost: 80, sale: 130, stock: 30, min: 8 },
    { code: 'P003', name: 'Jabón de baño', category: 'Higiene', cost: 25, sale: 45, stock: 3, min: 15 },
    { code: 'P004', name: 'Detergente (1kg)', category: 'Higiene', cost: 40, sale: 70, stock: 0, min: 10 },
    { code: 'P005', name: 'Frijoles negros (1kg)', category: 'Alimentos', cost: 60, sale: 100, stock: 25, min: 5 },
    { code: 'P006', name: 'Pasta dental', category: 'Higiene', cost: 30, sale: 55, stock: 18, min: 5 },
  ];

  for (const p of products) {
    const id = `prod-${p.code.toLowerCase()}`;
    db.run(`INSERT OR IGNORE INTO products (id, code, name, category, cost_price, sale_price, stock, min_stock, provider_id, created_at) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, p.code, p.name, p.category, p.cost, p.sale, p.stock, p.min, 'prov-001', new Date().toISOString()]);
  }

  // Default config
  db.run(`INSERT OR IGNORE INTO config (key, value) VALUES (?, ?)`, ['business_name', 'MIPYME Demo']);
  db.run(`INSERT OR IGNORE INTO config (key, value) VALUES (?, ?)`, ['business_address', 'La Habana, Cuba']);
  db.run(`INSERT OR IGNORE INTO config (key, value) VALUES (?, ?)`, ['business_phone', '+53 5555 5555']);
  db.run(`INSERT OR IGNORE INTO config (key, value) VALUES (?, ?)`, ['business_nif', 'MIP-000-000']);
  db.run(`INSERT OR IGNORE INTO config (key, value) VALUES (?, ?)`, ['last_invoice_number', '0']);
}

// OPFS persistence
async function saveToOPFS(): Promise<void> {
  if (!db) return;
  try {
    const data = db.export();
    const buffer = new Uint8Array(data);
    
    if ('storage' in navigator && 'getDirectory' in navigator.storage) {
      const root = await navigator.storage.getDirectory();
      const fileHandle = await root.getFileHandle(DB_NAME, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(buffer);
      await writable.close();
    }
  } catch (err) {
    console.error('Error saving to OPFS:', err);
  }
}

async function loadFromOPFS(): Promise<Uint8Array | null> {
  try {
    if ('storage' in navigator && 'getDirectory' in navigator.storage) {
      const root = await navigator.storage.getDirectory();
      const fileHandle = await root.getFileHandle(DB_NAME, { create: false });
      const file = await fileHandle.getFile();
      const buffer = await file.arrayBuffer();
      return new Uint8Array(buffer);
    }
  } catch (err) {
    // File doesn't exist yet
    return null;
  }
  return null;
}

// Save after every write operation
export async function persist(): Promise<void> {
  await saveToOPFS();
}

// Export database as downloadable file
export function exportDatabase(): Uint8Array | null {
  if (!db) return null;
  const data = db.export();
  return new Uint8Array(data);
}

// Import database from file
export async function importDatabase(buffer: ArrayBuffer): Promise<void> {
  const SQL = await initSqlJs({
    locateFile: (file: string) => {
      if (file.endsWith('.wasm')) {
        // sqlWasmUrl already includes the base path from Vite config
        return sqlWasmUrl;
      }
      return file;
    }
  });
  if (db) {
    db.close();
  }
  db = new SQL.Database(new Uint8Array(buffer));
  await saveToOPFS();
}

// Simple hash function
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(36) + str.length.toString(36);
}

// ============ QUERY HELPERS ============

export function run(sql: string, params: any[] = []): void {
  if (!db) throw new Error('Database not initialized');
  db.run(sql, params);
}

export function getAll<T>(sql: string, params: any[] = []): T[] {
  if (!db) throw new Error('Database not initialized');
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const results: T[] = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject() as T);
  }
  stmt.free();
  return results;
}

export function getOne<T>(sql: string, params: any[] = []): T | null {
  if (!db) throw new Error('Database not initialized');
  const stmt = db.prepare(sql);
  stmt.bind(params);
  let result: T | null = null;
  if (stmt.step()) {
    result = stmt.getAsObject() as T;
  }
  stmt.free();
  return result;
}

export function getDatabase(): Database | null {
  return db;
}

export { simpleHash };
