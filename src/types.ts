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
