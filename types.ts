
export enum Role {
  ADMIN = 'ADMIN',
  STAFF = 'STAFF',
  CUSTOMER = 'CUSTOMER'
}

export interface Location {
  id: string;
  name: string;
  address: string;
  type: 'WAREHOUSE' | 'STORE';
}

export interface Product {
  id: string;
  name: string;
  sku?: string;
  category: string;
  price: number;
  cost: number;
  hsnCode: string;
  taxRate: number; // Percentage
  stock: Record<string, number>; // LocationId -> Quantity
  minStockLevel: number; // Global default
  minStockThresholds?: Record<string, number>; // LocationId -> Min Stock Threshold
  maxStockLevel?: number; // Capacity planning
  leadTimeDays: number;
  supplier?: string;
  expiryDate?: string; // ISO Date String YYYY-MM-DD
  barcode?: string;
  status: 'Active' | 'Discontinued' | 'Seasonal';
  lastSaleDate?: string;
}

export interface CartItem extends Product {
  quantity: number;
  discount: number; // Percentage
}

export interface Sale {
  id: string;
  date: string;
  items: CartItem[];
  totalAmount: number;
  totalTax: number;
  subtotal: number;
  billDiscount: number; // Percentage
  customerName?: string;
  customerId?: string;
  locationId: string;
  paymentMethod: 'CASH' | 'CARD' | 'UPI';
  transactionId: string;
}

export interface Transfer {
  id: string;
  productId: string;
  fromLocationId: string;
  toLocationId: string;
  quantity: number;
  date: string; // ISO string
  timestamp: number;
  status: 'COMPLETED' | 'FAILED';
  reason?: string;
  notes?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
  isThinking?: boolean;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  gstNumber?: string;
  address?: string;
  loyaltyPoints: number;
  totalPurchases: number;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  rating: number; // 1-5
  category: string;
  paymentTerms: string; // e.g., "Net 30"
  lastSupplyDate: string;
}

export interface SalesTarget {
  id: string;
  locationId: string;
  month: string; // YYYY-MM
  targetAmount: number;
}

export interface BusinessGoal {
  id: string;
  text: string;
  deadline?: string;
  status: 'Pending' | 'Completed';
}

export interface TaxTier {
  id: string;
  name: string;
  categoryType?: 'Essential' | 'Standard' | 'Luxury' | 'Goods';
  rate: number; // Total Percentage
  cgst: number; // Percentage
  sgst: number; // Percentage
}

export interface Notification {
  id: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
  message: string;
  timestamp: number;
  details?: string;
}
