import {
  User, Product, Provider, Purchase, Sale, BusinessConfig, SaleItem, PurchaseItem,
  WeeklyClosing, WeeklyClosingAuditEntry, WeeklyClosingMetrics,
} from './types';
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

  // Register payable to provider for the purchase
  if (purchase.providerId) {
    const payableId = generateId();
    run(`INSERT INTO payables (id, provider_id, purchase_id, type, amount, description, date) VALUES (?,?,?,?,?,?,?)`,
      [payableId, purchase.providerId, purchase.id, 'purchase', purchase.totalCost,
       `Compra/Recepción: ${purchase.items.length} producto(s)`, purchase.date]);
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
    const product = getOne<any>('SELECT provider_id, cost_price FROM products WHERE id = ?', [item.productId]);
    run(`INSERT INTO sale_items
      (id, sale_id, product_id, product_name, quantity, unit_price, total, cost_price)
      VALUES (?,?,?,?,?,?,?,?)`,
      [itemId, sale.id, item.productId, item.productName, item.quantity, item.unitPrice, item.total, product?.cost_price || 0]);
    
    // Update stock
    run('UPDATE products SET stock = stock - ? WHERE id = ?', [item.quantity, item.productId]);
    
    // Register payable to provider (cost of product sold)
    if (product && product.provider_id) {
      const payableId = generateId();
      const payableAmount = product.cost_price * item.quantity;
      run(`INSERT INTO payables (id, provider_id, sale_id, type, amount, description, date) VALUES (?,?,?,?,?,?,?)`,
        [payableId, product.provider_id, sale.id, 'sale', payableAmount, 
         `Venta: ${item.productName} x${item.quantity}`, sale.date]);
    }
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

// ============ PAYABLES (Obligaciones) ============

export function getPayables(): import('./types').Payable[] {
  const rows = getAll<any>(
    'SELECT id, provider_id, sale_id, purchase_id, type, amount, description, date FROM payables ORDER BY date DESC'
  );
  return rows.map(r => ({
    id: r.id,
    providerId: r.provider_id,
    saleId: r.sale_id || undefined,
    purchaseId: r.purchase_id || undefined,
    type: r.type,
    amount: r.amount,
    description: r.description || '',
    date: r.date,
  }));
}

export function getPayablesByProvider(providerId: string): import('./types').Payable[] {
  const rows = getAll<any>(
    'SELECT id, provider_id, sale_id, purchase_id, type, amount, description, date FROM payables WHERE provider_id = ? ORDER BY date DESC',
    [providerId]
  );
  return rows.map(r => ({
    id: r.id,
    providerId: r.provider_id,
    saleId: r.sale_id || undefined,
    purchaseId: r.purchase_id || undefined,
    type: r.type,
    amount: r.amount,
    description: r.description || '',
    date: r.date,
  }));
}

export async function savePayable(payable: import('./types').Payable): Promise<void> {
  run(`INSERT INTO payables (id, provider_id, sale_id, purchase_id, type, amount, description, date) VALUES (?,?,?,?,?,?,?,?)`,
    [payable.id, payable.providerId, payable.saleId || null, payable.purchaseId || null, payable.type, payable.amount, payable.description, payable.date]);
  await persist();
}

export function getProviderBalance(providerId: string): number {
  const rows = getAll<any>(
    'SELECT type, amount FROM payables WHERE provider_id = ?',
    [providerId]
  );
  
  let balance = 0;
  for (const row of rows) {
    if (row.type === 'sale' || row.type === 'purchase') {
      balance += row.amount; // Deuda (obligación de pagar)
    } else if (row.type === 'payment') {
      balance -= row.amount; // Pago (reduce la deuda)
    }
  }
  return balance;
}

// ============ WEEKLY CLOSINGS ============

function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function getWeeklyClosingMetrics(startDate: string, endDate: string): WeeklyClosingMetrics {
  if (!startDate || !endDate || endDate < startDate) {
    return {
      salesCash: 0,
      salesTransfers: 0,
      providerCosts: 0,
      weekProfit: 0,
      emelyhProfit: 0,
      gaibelisProfit: 0,
    };
  }

  const aggregate = getOne<{
    sales_cash: number;
    sales_transfers: number;
    provider_costs: number;
  }>(
    `SELECT
      COALESCE(SUM(CASE WHEN lower(trim(payment_method)) = 'efectivo' THEN total ELSE 0 END), 0) AS sales_cash,
      COALESCE(SUM(CASE WHEN lower(trim(payment_method)) = 'transferencia' THEN total ELSE 0 END), 0) AS sales_transfers,
      COALESCE((
        SELECT SUM(items.cost_price * items.quantity)
        FROM sale_items items
        INNER JOIN sales cost_sales ON cost_sales.id = items.sale_id
        WHERE date(cost_sales.date) >= date(?) AND date(cost_sales.date) <= date(?)
      ), 0) AS provider_costs
     FROM sales
     WHERE date(date) >= date(?) AND date(date) <= date(?)`,
    [startDate, endDate, startDate, endDate]
  );
  const salesCash = roundCurrency(aggregate?.sales_cash || 0);
  const salesTransfers = roundCurrency(aggregate?.sales_transfers || 0);
  const providerCosts = roundCurrency(aggregate?.provider_costs || 0);
  const weekProfit = roundCurrency(salesCash + salesTransfers - providerCosts);
  const emelyhProfit = Math.trunc(weekProfit * 100 / 2) / 100;

  return {
    salesCash,
    salesTransfers,
    providerCosts,
    weekProfit,
    emelyhProfit,
    gaibelisProfit: roundCurrency(weekProfit - emelyhProfit),
  };
}

function mapWeeklyClosing(row: Record<string, any>): WeeklyClosing {
  return {
    id: row.id,
    startDate: row.start_date,
    endDate: row.end_date,
    salesCash: row.sales_cash,
    salesTransfers: row.sales_transfers,
    providerCosts: row.provider_costs,
    weekProfit: row.week_profit,
    emelyhProfit: row.emelyh_profit,
    gaibelisProfit: row.gaibelis_profit,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    creatorName: row.creator_name || row.created_by,
    updaterName: row.updater_name || (
      row.updated_by === 'system:migration-v2' ? 'Migración del sistema' : row.updated_by
    ),
  };
}

const weeklyClosingSelect = `
  SELECT w.*, creator.full_name AS creator_name, updater.full_name AS updater_name
  FROM weekly_closings w
  LEFT JOIN users creator ON creator.id = w.created_by
  LEFT JOIN users updater ON updater.id = w.updated_by
`;

export function getWeeklyClosings(dateFrom = '', dateTo = ''): WeeklyClosing[] {
  const conditions: string[] = [];
  const params: string[] = [];
  if (dateFrom) {
    conditions.push('w.end_date >= ?');
    params.push(dateFrom);
  }
  if (dateTo) {
    conditions.push('w.start_date <= ?');
    params.push(dateTo);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  return getAll<Record<string, any>>(
    `${weeklyClosingSelect} ${where} ORDER BY w.start_date DESC, w.created_at DESC`,
    params
  ).map(mapWeeklyClosing);
}

export async function saveWeeklyClosing(
  id: string | null,
  startDate: string,
  endDate: string,
  actorId: string
): Promise<void> {
  if (!startDate || !endDate || endDate < startDate) {
    throw new Error('El período semanal no es válido.');
  }
  if (!actorId) {
    throw new Error('No se pudo identificar al usuario que realiza el cuadre.');
  }
  const overlapping = getOne<{ id: string }>(
    `SELECT id FROM weekly_closings
     WHERE start_date <= ? AND end_date >= ? AND id != ?`,
    [endDate, startDate, id || '']
  );
  if (overlapping) {
    throw new Error('El período se solapa con otro cuadre semanal ya registrado.');
  }

  const metrics = getWeeklyClosingMetrics(startDate, endDate);
  const timestamp = new Date().toISOString();
  const closingId = id || generateId();
  const previousRow = id
    ? getOne<Record<string, any>>(`${weeklyClosingSelect} WHERE w.id = ?`, [id])
    : null;
  const beforeSnapshot = previousRow ? mapWeeklyClosing(previousRow) : null;
  const values = [
    startDate, endDate, metrics.salesCash, metrics.salesTransfers, metrics.providerCosts,
    metrics.weekProfit, metrics.emelyhProfit, metrics.gaibelisProfit,
  ];
  const insertColumns = [
    'id', 'start_date', 'end_date', 'sales_cash', 'sales_transfers', 'provider_costs',
    'week_profit', 'emelyh_profit', 'gaibelis_profit', 'created_by',
    'updated_by', 'created_at', 'updated_at',
  ];
  const insertValues: (string | number)[] = [
    closingId, ...values, actorId, actorId, timestamp, timestamp,
  ];
  const legacyValues: Record<string, number> = {
    cash_actual: 0,
    transfers_total: 0,
    transfers_emelyh: 0,
    transfers_gaibe: 0,
    cash_payable_providers: 0,
    transfers_payable_providers: 0,
    cash_receivable: 0,
    cash_provider: 0,
    week_difference: 0,
    remainder: 0,
    remainder_plus_profit: 0,
    combined_cash: 0,
    transfers_receivable: 0,
  };
  const closingColumns = getAll<{
    name: string;
    notnull: number;
    dflt_value: string | null;
    pk: number;
  }>('PRAGMA table_info(weekly_closings)');
  const suppliedColumns = new Set(insertColumns);
  const requiredLegacyColumns = closingColumns.filter(column =>
    column.notnull === 1 &&
    column.dflt_value === null &&
    column.pk === 0 &&
    !suppliedColumns.has(column.name)
  );
  for (const column of requiredLegacyColumns) {
    if (!(column.name in legacyValues)) {
      throw new Error(`No se puede guardar el cuadre: falta compatibilidad con la columna obligatoria "${column.name}".`);
    }
    insertColumns.push(column.name);
    insertValues.push(legacyValues[column.name]);
  }

  run('BEGIN TRANSACTION');
  try {
    if (previousRow) {
      run(
        `UPDATE weekly_closings SET
          start_date=?, end_date=?, sales_cash=?, sales_transfers=?, provider_costs=?,
          week_profit=?, emelyh_profit=?, gaibelis_profit=?,
          updated_by=?, updated_at=? WHERE id=?`,
        [...values, actorId, timestamp, closingId]
      );
    } else {
      run(
        `INSERT INTO weekly_closings (${insertColumns.join(', ')})
         VALUES (${insertColumns.map(() => '?').join(', ')})`,
        insertValues
      );
    }

    const savedRow = getOne<Record<string, any>>(`${weeklyClosingSelect} WHERE w.id = ?`, [closingId]);
    if (!savedRow) throw new Error('No se pudo recuperar el cuadre semanal guardado.');
    const afterSnapshot = mapWeeklyClosing(savedRow);
    run(
      `INSERT INTO weekly_closing_audit
        (id, closing_id, actor_id, action, before_snapshot, after_snapshot, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        generateId(), closingId, actorId, previousRow ? 'updated' : 'created',
        beforeSnapshot ? JSON.stringify(beforeSnapshot) : null,
        JSON.stringify(afterSnapshot), timestamp,
      ]
    );
    run('COMMIT');
  } catch (error) {
    run('ROLLBACK');
    throw error;
  }

  await persist();
}

export function getWeeklyClosingAudit(closingId: string): WeeklyClosingAuditEntry[] {
  return getAll<Record<string, any>>(
    `SELECT a.*, u.full_name AS actor_name FROM weekly_closing_audit a
     LEFT JOIN users u ON u.id = a.actor_id
     WHERE a.closing_id = ? ORDER BY a.created_at DESC`,
    [closingId]
  ).map(row => ({
    id: row.id,
    closingId: row.closing_id,
    actorId: row.actor_id,
    actorName: row.actor_name || (
      row.actor_id === 'system:migration-v2' ? 'Migración del sistema' : row.actor_id
    ),
    action: row.action,
    beforeSnapshot: row.before_snapshot ? JSON.parse(row.before_snapshot) : null,
    afterSnapshot: JSON.parse(row.after_snapshot),
    createdAt: row.created_at,
  }));
}

// ============ DB EXPORT/IMPORT ============

export { exportDatabase, importDatabase } from './database';