
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Product, Location, Sale, Transfer, Customer, SalesTarget, TaxTier, Notification, Supplier, BusinessGoal } from '../types';
import * as Constants from '../constants';

interface AppState {
  products: Product[];
  locations: Location[];
  sales: Sale[];
  transfers: Transfer[];
  customers: Customer[];
  salesTargets: SalesTarget[];
  taxTiers: TaxTier[];
  notifications: Notification[];
  suppliers: Supplier[];
  goals: BusinessGoal[];
  addProduct: (product: Product) => void;
  updateProduct: (product: Product) => void;
  deleteProducts: (productIds: string[]) => void;
  updateStock: (productId: string, locationId: string, quantityChange: number) => void;
  transferStock: (productId: string, fromLocId: string, toLocId: string, quantity: number, notes?: string) => void;
  addSale: (sale: Sale) => void;
  addCustomer: (customer: Customer) => void;
  updateCustomer: (customer: Customer) => void;
  setSalesTarget: (target: SalesTarget) => void;
  addTaxTier: (tier: TaxTier) => void;
  deleteTaxTier: (id: string) => void;
  addNotification: (type: Notification['type'], message: string, details?: string) => void;
  addGoal: (text: string, deadline?: string) => void;
  updateGoal: (id: string, text: string) => void;
  deleteGoal: (id: string) => void;
}

const AppContext = createContext<AppState | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>(Constants.INITIAL_PRODUCTS);
  const [locations] = useState<Location[]>(Constants.LOCATIONS);
  const [sales, setSales] = useState<Sale[]>(Constants.MOCK_SALES);
  const [transfers, setTransfers] = useState<Transfer[]>(Constants.MOCK_TRANSFERS);
  const [customers, setCustomers] = useState<Customer[]>(Constants.MOCK_CUSTOMERS);
  const [salesTargets, setSalesTargets] = useState<SalesTarget[]>(Constants.SALES_TARGETS);
  const [taxTiers, setTaxTiers] = useState<TaxTier[]>(Constants.DEFAULT_TAX_TIERS);
  const [suppliers] = useState<Supplier[]>(Constants.MOCK_SUPPLIERS);
  const [goals, setGoals] = useState<BusinessGoal[]>([
      { id: 'g1', text: 'Increase monthly revenue by 10%', status: 'Pending', deadline: '2024-12-31' },
      { id: 'g2', text: 'Reduce dead stock by 50 units', status: 'Pending', deadline: '2024-11-15' },
      { id: 'g3', text: 'Expand to new location in Pune', status: 'Completed', deadline: '2024-08-01' }
  ]);
  const [notifications, setNotifications] = useState<Notification[]>([
      { id: 'not-1', type: 'INFO', message: 'System Initialized', timestamp: Date.now() - 100000, details: 'Welcome to AutoInventory AI' }
  ]);

  const addNotification = (type: Notification['type'], message: string, details?: string) => {
      const newNotif: Notification = {
          id: `not-${Date.now()}-${Math.random()}`,
          type,
          message,
          timestamp: Date.now(),
          details
      };
      setNotifications(prev => [newNotif, ...prev].slice(0, 50)); // Keep last 50
  };

  const addProduct = (product: Product) => {
    setProducts(prev => [...prev, product]);
    addNotification('SUCCESS', `Product Added: ${product.name}`, `SKU: ${product.sku}`);
  };

  const updateProduct = (product: Product) => {
    setProducts(prev => prev.map(p => p.id === product.id ? product : p));
    addNotification('INFO', `Product Updated: ${product.name}`);
  };

  const deleteProducts = (productIds: string[]) => {
    setProducts(prev => prev.filter(p => !productIds.includes(p.id)));
    addNotification('WARNING', `${productIds.length} Products Deleted`);
  };

  const updateStock = (productId: string, locationId: string, quantityChange: number) => {
    setProducts(prev => prev.map(p => {
      if (p.id === productId) {
        const currentStock = p.stock[locationId] || 0;
        const newStock = Math.max(0, currentStock + quantityChange);
        
        // Low Stock Notification
        if (newStock <= p.minStockLevel && currentStock > p.minStockLevel) {
            const locName = locations.find(l => l.id === locationId)?.name;
            addNotification('WARNING', `Low Stock Alert: ${p.name}`, `Location: ${locName}. Remaining: ${newStock}`);
        }

        return {
          ...p,
          stock: {
            ...p.stock,
            [locationId]: newStock
          }
        };
      }
      return p;
    }));
  };

  const transferStock = (productId: string, fromLocId: string, toLocId: string, quantity: number, notes?: string) => {
    let success = false;
    let failReason = '';
    const fromLocName = locations.find(l=>l.id===fromLocId)?.name;
    const toLocName = locations.find(l=>l.id===toLocId)?.name;

    // Check stock first
    const product = products.find(p => p.id === productId);
    if (product) {
        const currentStock = product.stock[fromLocId] || 0;
        if (currentStock >= quantity) {
            success = true;
        } else {
            failReason = `Insufficient stock in ${fromLocName}. Requested: ${quantity}, Available: ${currentStock}`;
        }
    } else {
        failReason = 'Product not found';
    }

    if (success) {
        setProducts(prev => prev.map(p => {
          if (p.id === productId) {
            const fromStock = p.stock[fromLocId] || 0;
            const toStock = p.stock[toLocId] || 0;
            return {
              ...p,
              stock: {
                ...p.stock,
                [fromLocId]: fromStock - quantity,
                [toLocId]: toStock + quantity
              }
            };
          }
          return p;
        }));
        addNotification('SUCCESS', 'Stock Transfer Successful', `${quantity} units of ${product?.name} from ${fromLocName} to ${toLocName}`);
    } else {
        addNotification('ERROR', 'Stock Transfer Failed', failReason);
    }

    // Record Transfer (even if failed, for history)
    const newTransfer: Transfer = {
      id: `trf-${Date.now()}`,
      productId,
      fromLocationId: fromLocId,
      toLocationId: toLocId,
      quantity,
      date: new Date().toISOString(),
      timestamp: Date.now(),
      status: success ? 'COMPLETED' : 'FAILED',
      reason: failReason,
      notes: notes || ''
    };
    setTransfers(prev => [newTransfer, ...prev]);
  };

  const addCustomer = (customer: Customer) => {
    setCustomers(prev => [...prev, customer]);
    addNotification('SUCCESS', `New Customer Added: ${customer.name}`);
  };

  const updateCustomer = (customer: Customer) => {
    setCustomers(prev => prev.map(c => c.id === customer.id ? customer : c));
    addNotification('INFO', `Customer Updated: ${customer.name}`);
  };

  const addSale = (sale: Sale) => {
    setSales(prev => [...prev, sale]);
    
    // Deduct stock for sold items
    sale.items.forEach(item => {
      updateStock(item.id, sale.locationId, -item.quantity);
    });

    addNotification('SUCCESS', `New Sale Recorded: ₹${sale.totalAmount}`, `Invoice: ${sale.id}`);

    // Handle Loyalty
    if (sale.customerId) {
      const pointsEarned = Math.floor(sale.totalAmount / 100);
      setCustomers(prev => prev.map(c => {
        if (c.id === sale.customerId) {
          return {
            ...c,
            loyaltyPoints: c.loyaltyPoints + pointsEarned,
            totalPurchases: c.totalPurchases + sale.totalAmount
          };
        }
        return c;
      }));
    }
  };

  const setSalesTarget = (target: SalesTarget) => {
    setSalesTargets(prev => {
        const existingIdx = prev.findIndex(t => t.locationId === target.locationId && t.month === target.month);
        if (existingIdx >= 0) {
            const updated = [...prev];
            updated[existingIdx] = target;
            return updated;
        }
        return [...prev, target];
    });
    addNotification('INFO', 'Sales Target Updated');
  };

  const addTaxTier = (tier: TaxTier) => {
    setTaxTiers(prev => [...prev, tier]);
    addNotification('INFO', `New Tax Tier Added: ${tier.name}`);
  };

  const deleteTaxTier = (id: string) => {
    setTaxTiers(prev => prev.filter(t => t.id !== id));
    addNotification('WARNING', 'Tax Tier Deleted');
  };

  const addGoal = (text: string, deadline?: string) => {
      setGoals(prev => [...prev, { id: `g-${Date.now()}`, text, status: 'Pending', deadline }]);
  };

  const updateGoal = (id: string, text: string) => {
      setGoals(prev => prev.map(g => g.id === id ? { ...g, text } : g));
  };

  const deleteGoal = (id: string) => {
      setGoals(prev => prev.filter(g => g.id !== id));
  };

  return (
    <AppContext.Provider value={{ 
      products, locations, sales, transfers, customers, salesTargets, taxTiers, notifications, suppliers, goals,
      addProduct, updateProduct, deleteProducts, updateStock, transferStock, addSale,
      addCustomer, updateCustomer, setSalesTarget, addTaxTier, deleteTaxTier, addNotification,
      addGoal, updateGoal, deleteGoal
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
