import { User, Product, Provider, Purchase, Sale, BusinessConfig, SaleItem, PurchaseItem } from './types';
import { run, getAll, getOne, persist, simpleHash } from './database';

function generateId(): string {
  return crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// ============ AUTH ============

export function authenticate(username: string, password: string): User | null {
  const hash = simpleHash(password);
  const row = getOne<any>(
    'SELECT id, username, password_hash, role, full_name FROM users WHERE username = ? AND password_hash = ?',
    [username, hash]
  );
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    passwordHash: row.password_hash,
    role: row.role,
    fullName: row.full_name,
  };
}

// ============ PRODUCTS ============

export function getProducts(): Product[] {
  const rows = getAll<any>(
    'SELECT id, code, name, category, cost_price, sale_price, stock, min_stock, provider_id, created_at FROM products ORDER BY name'
  );
  return rows.map(r => ({
    id: r.id,
    code: r.code,
    name: r.name,
    category: r.category,
    costPrice: r.cost_price,
    salePrice: r.sale_price,
    stock: r.stock,
    minStock: r.min_stock,
    providerId: r.provider_id || '',
    createdAt: r.created_at,
  }));
}

export async function saveProduct(product: Product): Promise<void> {
  const existing = getOne<any>('SELECT id FROM products WHERE id = ?', [product.id]);
  if (existing) {
    run(`UPDATE products SET code=?, name=?, category=?, cost_price=?, sale_price=?, stock=?, min_stock=?, provider_id=? WHERE id=?`,
      [product.code, product.name, product.category, product.costPrice, product.salePrice, product.stock, product.minStock, product.providerId, product.id]);
  } else {
    run(`INSERT INTO products (id, code, name, category, cost_price, sale_price, stock, min_stock, provider_id, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [product.id, product.code, product.name, product.category, product.costPrice, product.salePrice, product.stock, product.minStock, product.providerId, product.createdAt]);
  }
  await persist();
}

export async function deleteProduct(id: string): Promise<void> {
  run('DELETE FROM products WHERE id = ?', [id]);
  await persist();
}

// ============ PROVIDERS ============

export function getProviders(): Provider[] {
  const rows = getAll<any>(
    'SELECT id, name, contact, phone, email, address, created_at FROM providers ORDER BY name'
  );
  return rows.map(r => ({
    id: r.id,
    name: r.name,
    contact: r.contact || '',
    phone: r.phone || '',
    email: r.email || '',
    address: r.address || '',
    createdAt: r.created_at,
  }));
}

export async function saveProvider(provider: Provider): Promise<void> {
  const existing = getOne<any>('SELECT id FROM providers WHERE id = ?', [provider.id]);
  if (existing) {
    run(`UPDATE providers SET name=?, contact=?, phone=?, email=?, address=? WHERE id=?`,
      [provider.name, provider.contact, provider.phone, provider.email, provider.address, provider.id]);
  } else {
    run(`INSERT INTO providers (id, name, contact, phone, email, address, created_at) VALUES (?,?,?,?,?,?,?)`,
      [provider.id, provider.name, provider.contact, provider.phone, provider.email, provider.address, provider.createdAt]);
  }
  await persist();
}

export async function deleteProvider(id: string): Promise<void> {
  run('DELETE FROM providers WHERE id = ?', [id]);
  await persist();
}

// ============ PURCHASES ============

export function getPurchases(): Purchase[] {
  const rows = getAll<any>('SELECT id, date, provider_id, total_cost, notes FROM purchases ORDER BY date DESC');
  return rows.map(r => {
    const items = getAll<any>('SELECT id, product_id, quantity, cost_price FROM purchase_items WHERE purchase_id = ?', [r.id]);
    return {
      id: r.id,
      date: r.date,
      providerId: r.provider_id || '',
      totalCost: r.total_cost,
      notes: r.notes || '',
      items: items.map(i => ({
        productId: i.product_id,
        quantity: i.quantity,
        costPrice: i.cost_price,
      })),
    };
  });
}

export async function savePurchase(purchase: Purchase): Promise<void> {
  run(`INSERT INTO purchases (id, date, provider_id, total_cost, notes) VALUES (?,?,?,?,?)`,
    [purchase.id, purchase.date, purchase.providerId, purchase.totalCost, purchase.notes]);

  for (const item of purchase.items) {
    const itemId = generateId();
    run(`INSERT INTO purchase_items (id, purchase_id, product_id, quantity, cost_price) VALUES (?,?,?,?,?)`,
      [itemId, purchase.id, item.productId, item.quantity, item.costPrice]);
    
    // Update stock
    run('UPDATE products SET stock = stock + ? WHERE id = ?', [item.quantity, item.productId]);
  }
  await persist();
}

// ============ SALES ============

export function getSales(): Sale[] {
  const rows = getAll<any>('SELECT id, invoice_number, date, seller_id, subtotal, total, payment_method, notes FROM sales ORDER BY date DESC');
  return rows.map(r => {
    const items = getAll<any>('SELECT id, product_id, product_name, quantity, unit_price, total FROM sale_items WHERE sale_id = ?', [r.id]);
    return {
      id: r.id,
      invoiceNumber: r.invoice_number,
      date: r.date,
      sellerId: r.seller_id || '',
      subtotal: r.subtotal,
      total: r.total,
      paymentMethod: r.payment_method || 'Efectivo',
      notes: r.notes || '',
      items: items.map(i => ({
        productId: i.product_id,
        productName: i.product_name,
        quantity: i.quantity,
        unitPrice: i.unit_price,
        total: i.total,
      })),
    };
  });
}

export async function saveSale(sale: Sale): Promise<void> {
  run(`INSERT INTO sales (id, invoice_number, date, seller_id, subtotal, total, payment_method, notes) VALUES (?,?,?,?,?,?,?,?)`,
    [sale.id, sale.invoiceNumber, sale.date, sale.sellerId, sale.subtotal, sale.total, sale.paymentMethod, sale.notes]);

  for (const item of sale.items) {
    const itemId = generateId();
    run(`INSERT INTO sale_items (id, sale_id, product_id, product_name, quantity, unit_price, total) VALUES (?,?,?,?,?,?,?)`,
      [itemId, sale.id, item.productId, item.productName, item.quantity, item.unitPrice, item.total]);
    
    // Update stock
    run('UPDATE products SET stock = stock - ? WHERE id = ?', [item.quantity, item.productId]);
  }

  // Update invoice number
  run(`UPDATE config SET value = ? WHERE key = 'last_invoice_number'`, [sale.invoiceNumber.toString()]);
  
  await persist();
}

export function getNextInvoiceNumber(): number {
  const row = getOne<any>("SELECT value FROM config WHERE key = 'last_invoice_number'");
  return (parseInt(row?.value || '0') || 0) + 1;
}

// ============ CONFIG ============

export function getConfig(): BusinessConfig {
  const rows = getAll<any>('SELECT key, value FROM config');
  const map: Record<string, string> = {};
  rows.forEach(r => { map[r.key] = r.value; });
  
  return {
    name: map['business_name'] || 'MIPYME Demo',
    address: map['business_address'] || '',
    phone: map['business_phone'] || '',
    nif: map['business_nif'] || '',
    lastInvoiceNumber: parseInt(map['last_invoice_number'] || '0') || 0,
  };
}

export async function saveConfig(config: BusinessConfig): Promise<void> {
  const entries: [string, string][] = [
    ['business_name', config.name],
    ['business_address', config.address],
    ['business_phone', config.phone],
    ['business_nif', config.nif],
    ['last_invoice_number', config.lastInvoiceNumber.toString()],
  ];
  for (const [key, value] of entries) {
    run(`INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)`, [key, value]);
  }
  await persist();
}

// ============ USERS ============

export function getUsers(): User[] {
  const rows = getAll<any>('SELECT id, username, password_hash, role, full_name FROM users');
  return rows.map(r => ({
    id: r.id,
    username: r.username,
    passwordHash: r.password_hash,
    role: r.role,
    fullName: r.full_name,
  }));
}

export async function saveUser(user: User & { passwordHash?: string }): Promise<void> {
  const existing = getOne<any>('SELECT id FROM users WHERE id = ?', [user.id]);
  if (existing) {
    if (user.passwordHash && user.passwordHash.length > 0 && !user.passwordHash.match(/^[a-z0-9]+$/)) {
      // New password provided
      const hash = simpleHash(user.passwordHash);
      run(`UPDATE users SET username=?, password_hash=?, role=?, full_name=? WHERE id=?`,
        [user.username, hash, user.role, user.fullName, user.id]);
    } else {
      run(`UPDATE users SET username=?, role=?, full_name=? WHERE id=?`,
        [user.username, user.role, user.fullName, user.id]);
    }
  } else {
    const hash = simpleHash(user.passwordHash || 'default');
    run(`INSERT INTO users (id, username, password_hash, role, full_name) VALUES (?,?,?,?,?)`,
      [user.id, user.username, hash, user.role, user.fullName]);
  }
  await persist();
}

// ============ SESSION (localStorage for current user only) ============

const SESSION_KEY = 'inv_current_user';

export function getCurrentUser(): User | null {
  try {
    const data = localStorage.getItem(SESSION_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export function setCurrentUser(user: User | null): void {
  if (user) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(SESSION_KEY);
  }
}

// ============ DB EXPORT/IMPORT ============

export { exportDatabase, importDatabase } from './database';
