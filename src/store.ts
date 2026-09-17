import { User, Product, Provider, Purchase, Sale, BusinessConfig } from './types';
import { v4 as uuidv4 } from 'uuid';

const KEYS = {
  users: 'inv_users',
  products: 'inv_products',
  providers: 'inv_providers',
  purchases: 'inv_purchases',
  sales: 'inv_sales',
  config: 'inv_config',
  currentUser: 'inv_current_user',
};

// Simple hash function for passwords (not production-grade but works offline)
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(36) + str.length.toString(36);
}

function get<T>(key: string, fallback: T): T {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : fallback;
  } catch {
    return fallback;
  }
}

function set<T>(key: string, data: T): void {
  localStorage.setItem(key, JSON.stringify(data));
}

// Initialize default data
export function initializeStore(): void {
  const users = get<User[]>(KEYS.users, []);
  if (users.length === 0) {
    const defaultUsers: User[] = [
      {
        id: uuidv4(),
        username: 'admin',
        passwordHash: simpleHash('admin123'),
        role: 'admin',
        fullName: 'Administrador Principal',
      },
      {
        id: uuidv4(),
        username: 'vendedor',
        passwordHash: simpleHash('vendedor123'),
        role: 'vendedor',
        fullName: 'Vendedor Demo',
      },
    ];
    set(KEYS.users, defaultUsers);
  }

  const config = get<BusinessConfig | null>(KEYS.config, null);
  if (!config) {
    set(KEYS.config, {
      name: 'MIPYME Demo',
      address: 'La Habana, Cuba',
      phone: '+53 5555 5555',
      nif: 'MIP-000-000',
      lastInvoiceNumber: 0,
    });
  }

  // Add sample products if none exist
  const products = get<Product[]>(KEYS.products, []);
  if (products.length === 0) {
    const providers = get<Provider[]>(KEYS.providers, []);
    let providerId = '';
    if (providers.length === 0) {
      const defaultProviders: Provider[] = [
        { id: uuidv4(), name: 'Proveedor General', contact: 'Juan Pérez', phone: '+53 5000 0001', email: 'proveedor@demo.cu', address: 'La Habana', createdAt: new Date().toISOString() },
      ];
      set(KEYS.providers, defaultProviders);
      providerId = defaultProviders[0].id;
    } else {
      providerId = providers[0].id;
    }

    const sampleProducts: Product[] = [
      { id: uuidv4(), code: 'P001', name: 'Arroz (5kg)', category: 'Alimentos', costPrice: 150, salePrice: 220, stock: 45, minStock: 10, providerId, createdAt: new Date().toISOString() },
      { id: uuidv4(), code: 'P002', name: 'Aceite (1L)', category: 'Alimentos', costPrice: 80, salePrice: 130, stock: 30, minStock: 8, providerId, createdAt: new Date().toISOString() },
      { id: uuidv4(), code: 'P003', name: 'Jabón de baño', category: 'Higiene', costPrice: 25, salePrice: 45, stock: 3, minStock: 15, providerId, createdAt: new Date().toISOString() },
      { id: uuidv4(), code: 'P004', name: 'Detergente (1kg)', category: 'Higiene', costPrice: 40, salePrice: 70, stock: 0, minStock: 10, providerId, createdAt: new Date().toISOString() },
      { id: uuidv4(), code: 'P005', name: 'Frijoles negros (1kg)', category: 'Alimentos', costPrice: 60, salePrice: 100, stock: 25, minStock: 5, providerId, createdAt: new Date().toISOString() },
      { id: uuidv4(), code: 'P006', name: 'Pasta dental', category: 'Higiene', costPrice: 30, salePrice: 55, stock: 18, minStock: 5, providerId, createdAt: new Date().toISOString() },
    ];
    set(KEYS.products, sampleProducts);
  }
}

// Auth
export function authenticate(username: string, password: string): User | null {
  const users = get<User[]>(KEYS.users, []);
  const hash = simpleHash(password);
  return users.find(u => u.username === username && u.passwordHash === hash) || null;
}

export function getCurrentUser(): User | null {
  return get<User | null>(KEYS.currentUser, null);
}

export function setCurrentUser(user: User | null): void {
  set(KEYS.currentUser, user);
}

// Products
export function getProducts(): Product[] {
  return get<Product[]>(KEYS.products, []);
}

export function saveProduct(product: Product): void {
  const products = getProducts();
  const idx = products.findIndex(p => p.id === product.id);
  if (idx >= 0) {
    products[idx] = product;
  } else {
    products.push(product);
  }
  set(KEYS.products, products);
}

export function deleteProduct(id: string): void {
  const products = getProducts().filter(p => p.id !== id);
  set(KEYS.products, products);
}

// Providers
export function getProviders(): Provider[] {
  return get<Provider[]>(KEYS.providers, []);
}

export function saveProvider(provider: Provider): void {
  const providers = getProviders();
  const idx = providers.findIndex(p => p.id === provider.id);
  if (idx >= 0) {
    providers[idx] = provider;
  } else {
    providers.push(provider);
  }
  set(KEYS.providers, providers);
}

export function deleteProvider(id: string): void {
  const providers = getProviders().filter(p => p.id !== id);
  set(KEYS.providers, providers);
}

// Purchases
export function getPurchases(): Purchase[] {
  return get<Purchase[]>(KEYS.purchases, []);
}

export function savePurchase(purchase: Purchase): void {
  const purchases = getPurchases();
  purchases.push(purchase);
  set(KEYS.purchases, purchases);
  
  // Update stock
  const products = getProducts();
  purchase.items.forEach(item => {
    const prod = products.find(p => p.id === item.productId);
    if (prod) {
      prod.stock += item.quantity;
    }
  });
  set(KEYS.products, products);
}

// Sales
export function getSales(): Sale[] {
  return get<Sale[]>(KEYS.sales, []);
}

export function saveSale(sale: Sale): void {
  const sales = getSales();
  sales.push(sale);
  set(KEYS.sales, sales);
  
  // Update stock
  const products = getProducts();
  sale.items.forEach(item => {
    const prod = products.find(p => p.id === item.productId);
    if (prod) {
      prod.stock -= item.quantity;
    }
  });
  set(KEYS.products, products);
  
  // Update invoice number
  const config = get<BusinessConfig>(KEYS.config, {} as BusinessConfig);
  config.lastInvoiceNumber = sale.invoiceNumber;
  set(KEYS.config, config);
}

export function getNextInvoiceNumber(): number {
  const config = get<BusinessConfig>(KEYS.config, {} as BusinessConfig);
  return (config.lastInvoiceNumber || 0) + 1;
}

// Config
export function getConfig(): BusinessConfig {
  return get<BusinessConfig>(KEYS.config, {
    name: 'MIPYME Demo',
    address: '',
    phone: '',
    nif: '',
    lastInvoiceNumber: 0,
  });
}

export function saveConfig(config: BusinessConfig): void {
  set(KEYS.config, config);
}

// Users management (admin only)
export function getUsers(): User[] {
  return get<User[]>(KEYS.users, []);
}

export function saveUser(user: User): void {
  const users = getUsers();
  const idx = users.findIndex(u => u.id === user.id);
  if (idx >= 0) {
    users[idx] = { ...users[idx], ...user };
  } else {
    users.push({ ...user, passwordHash: simpleHash(user.passwordHash) });
  }
  set(KEYS.users, users);
}
