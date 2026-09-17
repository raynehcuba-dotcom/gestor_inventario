import { writable, type Writable } from 'svelte/store';
import type { User, Provider, Product, Purchase, Sale, Config, Payable } from './types';
import { 
  initDatabase, 
  getAll, 
  getOne, 
  run, 
  persist,
  exportDatabase,
  importDatabase
} from './database';

// Store global del estado de autenticación
export const currentUser: Writable<User | null> = writable(null);

// Store global para el estado de carga
export const loading: Writable<boolean> = writable(false);

// Store para configuración del negocio
export const businessConfig: Writable<Config> = writable({
  business_name: 'Mi Negocio',
  business_address: 'Dirección del negocio',
  business_phone: 'Teléfono del negocio',
  business_nif: 'NIF del negocio',
  last_invoice_number: 0
});

// Store para proveedores
export const providers: Writable<Provider[]> = writable([]);

// Store para productos
export const products: Writable<Product[]> = writable([]);

// Store para compras
export const purchases: Writable<Purchase[]> = writable([]);

// Store para ventas
export const sales: Writable<Sale[]> = writable([]);

// Store para cuentas por pagar
export const payables: Writable<Payable[]> = writable([]);

// Función para inicializar la aplicación
export async function initializeApp(): Promise<void> {
  loading.set(true);
  try {
    await initDatabase();
    await loadAllData();
    await loadBusinessConfig();
  } finally {
    loading.set(false);
  }
}

// Cargar toda la data inicial
async function loadAllData(): Promise<void> {
  providers.set(await getAllProviders());
  products.set(await getAllProducts());
  purchases.set(await getAllPurchases());
  sales.set(await getAllSales());
  payables.set(await getAllPayables());
}

// Cargar configuración del negocio
async function loadBusinessConfig(): Promise<void> {
  const config = await getAll<{ key: string; value: string }>('SELECT * FROM config');
  const configObj: Partial<Config> = {};
  
  for (const item of config) {
    if (item.key === 'last_invoice_number') {
      configObj[item.key] = parseInt(item.value) || 0;
    } else {
      configObj[item.key] = item.value;
    }
  }
  
  businessConfig.set(configObj as Config);
}

// ==================== AUTHENTICATION ====================
export async function login(username: string, password: string): Promise<User | null> {
  loading.set(true);
  try {
    const user = getOne<User>(
      'SELECT id, username, role, full_name FROM users WHERE username = ? AND password_hash = ?',
      [username, simpleHash(password)]
    );
    
    if (user) {
      currentUser.set(user);
      return user;
    }
    return null;
  } finally {
    loading.set(false);
  }
}

export async function logout(): Promise<void> {
  currentUser.set(null);
}

export async function changePassword(userId: string, oldPassword: string, newPassword: string): Promise<boolean> {
  loading.set(true);
  try {
    const user = getOne<{ password_hash: string }>(
      'SELECT password_hash FROM users WHERE id = ?',
      [userId]
    );
    
    if (user && user.password_hash === simpleHash(oldPassword)) {
      run(
        'UPDATE users SET password_hash = ? WHERE id = ?',
        [simpleHash(newPassword), userId]
      );
      await persist();
      return true;
    }
    return false;
  } finally {
    loading.set(false);
  }
}

// ==================== PROVIDERS ====================
export async function getAllProviders(): Promise<Provider[]> {
  return getAll<Provider>(
    `SELECT * FROM providers ORDER BY name ASC`
  );
}

export async function getProviderById(id: string): Promise<Provider | null> {
  return getOne<Provider>('SELECT * FROM providers WHERE id = ?', [id]);
}

export async function createProvider(provider: Omit<Provider, 'id' | 'created_at'>): Promise<Provider> {
  const id = `prov-${Date.now()}`;
  const createdAt = new Date().toISOString();
  
  run(
    `INSERT INTO providers (id, name, contact, phone, email, address, created_at) 
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, provider.name, provider.contact, provider.phone, provider.email, provider.address, createdAt]
  );
  
  await persist();
  const newProvider = await getProviderById(id);
  if (newProvider) {
    providers.update(p => [...p, newProvider]);
  }
  return newProvider!;
}

export async function updateProvider(provider: Provider): Promise<void> {
  run(
    `UPDATE providers SET name = ?, contact = ?, phone = ?, email = ?, address = ?
     WHERE id = ?`,
    [provider.name, provider.contact, provider.phone, provider.email, provider.address, provider.id]
  );
  
  await persist();
  providers.update(p => p.map(pr => pr.id === provider.id ? provider : pr));
}

export async function deleteProvider(id: string): Promise<void> {
  run('DELETE FROM providers WHERE id = ?', [id]);
  await persist();
  providers.update(p => p.filter(pr => pr.id !== id));
}

// ==================== PRODUCTS ====================
export async function getAllProducts(): Promise<Product[]> {
  return getAll<Product>(
    `SELECT p.*, pr.name as provider_name
     FROM products p
     LEFT JOIN providers pr ON p.provider_id = pr.id
     ORDER BY p.name ASC`
  );
}

export async function getProductById(id: string): Promise<Product | null> {
  return getOne<Product>(
    `SELECT p.*, pr.name as provider_name
     FROM products p
     LEFT JOIN providers pr ON p.provider_id = pr.id
     WHERE p.id = ?`,
    [id]
  );
}

export async function createProduct(product: Omit<Product, 'id' | 'created_at'>): Promise<Product> {
  const id = `prod-${Date.now()}`;
  const createdAt = new Date().toISOString();
  
  run(
    `INSERT INTO products (id, code, name, category, cost_price, sale_price, stock, min_stock, provider_id, created_at) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, product.code, product.name, product.category, product.cost_price, product.sale_price, product.stock, product.min_stock, product.provider_id, createdAt]
  );
  
  await persist();
  const newProduct = await getProductById(id);
  if (newProduct) {
    products.update(p => [...p, newProduct]);
  }
  return newProduct!;
}

export async function updateProduct(product: Product): Promise<void> {
  run(
    `UPDATE products SET code = ?, name = ?, category = ?, cost_price = ?, sale_price = ?, 
          stock = ?, min_stock = ?, provider_id = ?
     WHERE id = ?`,
    [product.code, product.name, product.category, product.cost_price, product.sale_price, 
     product.stock, product.min_stock, product.provider_id, product.id]
  );
  
  await persist();
  products.update(p => p.map(pr => pr.id === product.id ? product : pr));
}

export async function deleteProduct(id: string): Promise<void> {
  run('DELETE FROM products WHERE id = ?', [id]);
  await persist();
  products.update(p => p.filter(pr => pr.id !== id));
}

export async function updateStock(productId: string, quantity: number): Promise<void> {
  run(
    `UPDATE products SET stock = stock + ? WHERE id = ?`,
    [quantity, productId]
  );
  
  await persist();
  const updatedProducts = await getAllProducts();
  products.set(updatedProducts);
}

// ==================== PURCHASES ====================
export async function getAllPurchases(): Promise<Purchase[]> {
  return getAll<Purchase>(
    `SELECT p.*, pr.name as provider_name
     FROM purchases p
     LEFT JOIN providers pr ON p.provider_id = pr.id
     ORDER BY p.date DESC, p.id DESC`
  );
}

export async function getPurchaseById(id: string): Promise<Purchase> {
  const purchase = getOne<Purchase>(
    `SELECT p.*, pr.name as provider_name
     FROM purchases p
     LEFT JOIN providers pr ON p.provider_id = pr.id
     WHERE p.id = ?`,
    [id]
  )!;
  
  const items = await getAll<any>(
    `SELECT pi.*, pr.name as product_name
     FROM purchase_items pi
     LEFT JOIN products pr ON pi.product_id = pr.id
     WHERE pi.purchase_id = ?`,
    [id]
  );
  
  return { ...purchase, items };
}

export async function createPurchase(purchase: Omit<Purchase, 'id'>): Promise<Purchase> {
  const id = `pur-${Date.now()}`;
  
  run(
    `INSERT INTO purchases (id, date, provider_id, total_cost, notes) 
     VALUES (?, ?, ?, ?, ?)`,
    [id, purchase.date, purchase.provider_id, purchase.total_cost, purchase.notes]
  );
  
  // Insertar items de compra
  for (const item of purchase.items) {
    const itemId = `puri-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    run(
      `INSERT INTO purchase_items (id, purchase_id, product_id, quantity, cost_price) 
       VALUES (?, ?, ?, ?, ?)`,
      [itemId, id, item.product_id, item.quantity, item.cost_price]
    );
    
    // Actualizar stock
    await updateStock(item.product_id, item.quantity);
  }
  
  await persist();
  const newPurchase = await getPurchaseById(id);
  purchases.update(p => [newPurchase, ...p]);
  return newPurchase;
}

// ==================== SALES ====================
export async function getAllSales(): Promise<Sale[]> {
  return getAll<Sale>(
    `SELECT s.*, u.full_name as seller_name
     FROM sales s
     LEFT JOIN users u ON s.seller_id = u.id
     ORDER BY s.date DESC, s.invoice_number DESC`
  );
}

export async function getSaleById(id: string): Promise<Sale> {
  const sale = getOne<Sale>(
    `SELECT s.*, u.full_name as seller_name
     FROM sales s
     LEFT JOIN users u ON s.seller_id = u.id
     WHERE s.id = ?`,
    [id]
  )!;
  
  const items = await getAll<any>(
    `SELECT si.*, pr.name as product_name
     FROM sale_items si
     LEFT JOIN products pr ON si.product_id = pr.id
     WHERE si.sale_id = ?`,
    [id]
  );
  
  return { ...sale, items };
}

export async function createSale(sale: Omit<Sale, 'id' | 'invoice_number'>): Promise<Sale> {
  // Obtener número de factura
  const lastInvoiceNumber = getOne<{ value: string }>('SELECT value FROM config WHERE key = "last_invoice_number"');
  const invoiceNumber = (parseInt(lastInvoiceNumber?.value || '0') + 1).toString().padStart(6, '0');
  
  const id = `sal-${Date.now()}`;
  
  run(
    `INSERT INTO sales (id, invoice_number, date, seller_id, subtotal, total, payment_method, notes) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, invoiceNumber, sale.date, sale.seller_id, sale.subtotal, sale.total, sale.payment_method, sale.notes]
  );
  
  // Insertar items de venta
  for (const item of sale.items) {
    const itemId = `sali-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    run(
      `INSERT INTO sale_items (id, sale_id, product_id, product_name, quantity, unit_price, total) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [itemId, id, item.product_id, item.product_name, item.quantity, item.unit_price, item.total]
    );
    
    // Actualizar stock
    await updateStock(item.product_id, -item.quantity);
  }
  
  // Actualizar número de factura
  run(
    `UPDATE config SET value = ? WHERE key = "last_invoice_number"`,
    [invoiceNumber]
  );
  
  await persist();
  const newSale = await getSaleById(id);
  sales.update(s => [newSale, ...s]);
  return newSale;
}

// ==================== PAYABLES ====================
export async function getAllPayables(): Promise<Payable[]> {
  return getAll<Payable>(
    `SELECT pa.*, pr.name as provider_name
     FROM payables pa
     LEFT JOIN providers pr ON pa.provider_id = pr.id
     ORDER BY pa.date DESC`
  );
}

export async function getPayableById(id: string): Promise<Payable | null> {
  return getOne<Payable>(
    `SELECT pa.*, pr.name as provider_name
     FROM payables pa
     LEFT JOIN providers pr ON pa.provider_id = pr.id
     WHERE pa.id = ?`,
    [id]
  );
}

export async function createPayable(payable: Omit<Payable, 'id'>): Promise<Payable> {
  const id = `pay-${Date.now()}`;
  
  run(
    `INSERT INTO payables (id, provider_id, sale_id, purchase_id, type, amount, description, date) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, payable.provider_id, payable.sale_id, payable.purchase_id, payable.type, payable.amount, payable.description, payable.date]
  );
  
  await persist();
  const newPayable = await getPayableById(id);
  if (newPayable) {
    payables.update(p => [...p, newPayable]);
  }
  return newPayable!;
}

export async function deletePayable(id: string): Promise<void> {
  run('DELETE FROM payables WHERE id = ?', [id]);
  await persist();
  payables.update(p => p.filter(pa => pa.id !== id));
}

// ==================== CONFIGURATION ====================
export async function updateBusinessConfig(config: Config): Promise<void> {
  for (const [key, value] of Object.entries(config)) {
    run(
      `INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)`,
      [key, String(value)]
    );
  }
  
  await persist();
  businessConfig.set(config);
}

// ==================== REPORTS ====================
export async function getLowStockProducts(): Promise<Product[]> {
  return getAll<Product>(
    `SELECT p.*, pr.name as provider_name
     FROM products p
     LEFT JOIN providers pr ON p.provider_id = pr.id
     WHERE p.stock <= p.min_stock
     ORDER BY p.stock ASC`
  );
}

export async function getDailySales(date: string): Promise<Sale[]> {
  return getAll<Sale>(
    `SELECT s.*, u.full_name as seller_name
     FROM sales s
     LEFT JOIN users u ON s.seller_id = u.id
     WHERE DATE(s.date) = ?
     ORDER BY s.date DESC`,
    [date]
  );
}

export async function getMonthlySales(year: number, month: number): Promise<Sale[]> {
  const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
  const endDate = new Date(year, month, 0).toISOString().split('T')[0];
  
  return getAll<Sale>(
    `SELECT s.*, u.full_name as seller_name
     FROM sales s
     LEFT JOIN users u ON s.seller_id = u.id
     WHERE DATE(s.date) >= ? AND DATE(s.date) <= ?
     ORDER BY s.date DESC`,
    [startDate, endDate]
  );
}

export async function getSalesBySeller(sellerId: string, startDate: string, endDate: string): Promise<Sale[]> {
  return getAll<Sale>(
    `SELECT s.*, u.full_name as seller_name
     FROM sales s
     LEFT JOIN users u ON s.seller_id = u.id
     WHERE s.seller_id = ? AND DATE(s.date) >= ? AND DATE(s.date) <= ?
     ORDER BY s.date DESC`,
    [sellerId, startDate, endDate]
  );
}

// ==================== EXPORT/IMPORT ====================
export function exportDB(): Uint8Array | null {
  return exportDatabase();
}

export async function importDB(buffer: ArrayBuffer): Promise<void> {
  await importDatabase(buffer);
  await loadAllData();
  await loadBusinessConfig();
}

// ==================== HELPERS ====================
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(36) + str.length.toString(36);
}