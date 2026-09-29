export type Role = 'admin' | 'vendedor';

export interface User {
  id: string;
  username: string;
  passwordHash: string;
  role: Role;
  fullName: string;
}

export interface Product {
  id: string;
  code: string;
  name: string;
  category: string;
  costPrice: number;
  salePrice: number;
  stock: number;
  minStock: number;
  providerId: string;
  createdAt: string;
}

export interface Provider {
  id: string;
  name: string;
  contact: string;
  phone: string;
  email: string;
  address: string;
  createdAt: string;
}

export interface Purchase {
  id: string;
  date: string;
  providerId: string;
  items: PurchaseItem[];
  totalCost: number;
  notes: string;
}

export interface PurchaseItem {
  productId: string;
  quantity: number;
  costPrice: number;
}

export interface Sale {
  id: string;
  invoiceNumber: number;
  date: string;
  sellerId: string;
  items: SaleItem[];
  subtotal: number;
  total: number;
  paymentMethod: string;
  notes: string;
}

export interface SaleItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface BusinessConfig {
  name: string;
  address: string;
  phone: string;
  nif: string;
  lastInvoiceNumber: number;
}

export interface Payable {
  id: string;
  providerId: string;
  saleId?: string;
  purchaseId?: string;
  type: 'sale' | 'purchase' | 'payment';
  amount: number;
  description: string;
  date: string;
}

export interface WeeklyClosingMetrics {
  salesCash: number;
  salesTransfers: number;
  providerCosts: number;
  weekProfit: number;
  emelyhProfit: number;
  gaibelisProfit: number;
}

export interface WeeklyClosing extends WeeklyClosingMetrics {
  id: string;
  startDate: string;
  endDate: string;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
  creatorName: string;
  updaterName: string;
}

export interface WeeklyClosingAuditEntry {
  id: string;
  closingId: string;
  actorId: string;
  actorName: string;
  action: 'created' | 'updated';
  beforeSnapshot: Partial<WeeklyClosing> | null;
  afterSnapshot: Partial<WeeklyClosing>;
  createdAt: string;
}
