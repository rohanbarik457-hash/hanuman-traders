
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Search, MapPin, ArrowRightLeft, Filter, Plus, History, Edit, Box, X, IndianRupee, Skull, Truck, Tag, AlertTriangle, Calendar, CheckCircle, Info, MoreHorizontal, CheckSquare, Camera, Trash2, ChevronDown, Check, ScanLine, Clock, Wand2, Zap, FileText } from 'lucide-react';
import { Product } from '../types';
import { identifyProductFromImage } from '../services/geminiService';

export const Inventory: React.FC = () => {
  const { products, locations, transferStock, addProduct, updateProduct, deleteProducts, transfers, addNotification } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [selectedSupplier, setSelectedSupplier] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortOption, setSortOption] = useState<'name' | 'stockAsc' | 'stockDesc' | 'valueDesc'>('name');
  const [expiryFilter, setExpiryFilter] = useState<'all' | 'soon' | 'expired' | 'safe'>('all');
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);

  // Transfer State
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferStep, setTransferStep] = useState<'input' | 'confirm'>('input');
  const [transferData, setTransferData] = useState({ productId: '', isBulk: false, fromLoc: '', toLoc: '', qty: 0, notes: '' });
  const [transferStatus, setTransferStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [transferError, setTransferError] = useState('');

  // Product Modal State
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState<Partial<Product> & { stockInputs?: Record<string, number>, minStockInputs?: Record<string, number> }>({}); 
  
  // Bulk Edit Modal State
  const [isBulkEditModalOpen, setIsBulkEditModalOpen] = useState(false);
  const [bulkForm, setBulkForm] = useState<{ supplier?: string, status?: string }>({ supplier: '', status: '' });

  const [historyProductId, setHistoryProductId] = useState<string | null>(null);

  // --- Helper Functions ---

  const generateID = (prefix: string) => {
      return `${prefix}-${Math.floor(Math.random() * 100000).toString().padStart(6, '0')}`;
  };

  const getDisplayStock = (product: Product, locId: string) => 
    locId === 'all' ? Object.values(product.stock).reduce((a, b) => a + b, 0) : product.stock[locId] || 0;

  // Check for low stock based on location-specific thresholds
  const isLowStock = (product: Product, locId: string) => {
      const currentStock = getDisplayStock(product, locId);
      if (locId === 'all') {
          return locations.some(l => {
              const t = product.minStockThresholds?.[l.id] ?? product.minStockLevel;
              return (product.stock[l.id] || 0) < t;
          });
      } else {
          const threshold = product.minStockThresholds?.[locId] ?? product.minStockLevel;
          return currentStock < threshold;
      }
  };

  const isDeadStock = (product: Product) => {
      if (!product.lastSaleDate) return false;
      const now = new Date().getTime();
      const daysSinceSale = (now - new Date(product.lastSaleDate).getTime()) / (1000 * 3600 * 24);
      return daysSinceSale > 60 && getDisplayStock(product, 'all') > 0;
  };

  const handleDeadStockOptimize = (product: Product) => {
      // Simulate Logic: Find a store with active sales for this item category (mocked) and suggest transfer
      // For this demo, we'll just pick a random other location and prompt a discounted transfer
      const targetLoc = locations.find(l => l.type === 'STORE' && product.stock[l.id] < 10) || locations[0];
      const sourceLoc = locations.find(l => product.stock[l.id] > 0);
      
      if (!sourceLoc) {
          alert("No stock available to move.");
          return;
      }

      if (confirm(`Dead Stock Optimization:\n\nMove stock from ${sourceLoc.name} to ${targetLoc.name} with a 20% discount tag?\n\nThis will generate a special transfer invoice.`)) {
          // Perform transfer
          const qty = Math.min(10, product.stock[sourceLoc.id]);
          transferStock(product.id, sourceLoc.id, targetLoc.id, qty, "Dead Stock Optimization");
          
          // Generate simulated Invoice/Transaction ID for this movement
          const specialTxnId = generateID('CLR-SALE');
          addNotification('INFO', 'Dead Stock Clearance Initiated', `Txn: ${specialTxnId}. Moved ${qty} units of ${product.name} to ${targetLoc.name} @ 20% OFF`);
      }
  };

  // --- Metrics ---

  const metrics = useMemo(() => {
    const totalItems = products.reduce((acc, p) => acc + getDisplayStock(p, 'all'), 0);
    const totalValue = products.reduce((acc, p) => acc + (getDisplayStock(p, 'all') * p.cost), 0);
    
    const deadStockCount = products.filter(isDeadStock).length;
    const lowStockCount = products.filter(p => isLowStock(p, selectedLocation)).length;

    return { totalItems, totalValue, deadStockCount, lowStockCount };
  }, [products, selectedLocation]);

  // --- Filtering & Sorting ---

  const suppliers = useMemo(() => Array.from(new Set(products.map(p => p.supplier).filter(Boolean) as string[])), [products]);
  const categories = useMemo(() => Array.from(new Set(products.map(p => p.category))), [products]);

  const filteredProducts = useMemo(() => {
      return products.filter(p => {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = p.name.toLowerCase().includes(searchLower) || 
                              p.sku?.toLowerCase().includes(searchLower) || 
                              p.barcode?.includes(searchTerm);
        
        if (!matchesSearch) return false;
        if (selectedSupplier !== 'all' && p.supplier !== selectedSupplier) return false;
        if (selectedCategory !== 'all' && p.category !== selectedCategory) return false;
        if (selectedLocation !== 'all' && (p.stock[selectedLocation] || 0) === 0) return false;

        // Expiry Filter
        if (expiryFilter !== 'all') {
            if (!p.expiryDate) return expiryFilter === 'safe';
            const today = new Date();
            const expDate = new Date(p.expiryDate);
            const diffDays = (expDate.getTime() - today.getTime()) / (1000 * 3600 * 24);

            if (expiryFilter === 'expired' && diffDays < 0) return true;
            if (expiryFilter === 'soon' && diffDays >= 0 && diffDays <= 30) return true;
            if (expiryFilter === 'safe' && diffDays > 30) return true;
            return false;
        }

        return true;
      }).sort((a, b) => {
        const stockA = getDisplayStock(a, selectedLocation);
        const stockB = getDisplayStock(b, selectedLocation);
        const valueA = stockA * a.cost;
        const valueB = stockB * b.cost;

        switch (sortOption) {
            case 'stockAsc': return stockA - stockB;
            case 'stockDesc': return stockB - stockA;
            case 'valueDesc': return valueB - valueA;
            case 'name': default: return a.name.localeCompare(b.name);
        }
      });
  }, [products, searchTerm, selectedSupplier, selectedLocation, selectedCategory, sortOption, expiryFilter]);

  // --- Handlers ---

  const handleBulkTransfer = () => {
      if (selectedProductIds.size === 0) return;
      setTransferData({ productId: '', isBulk: true, fromLoc: locations[0].id, toLoc: locations[1]?.id || '', qty: 0, notes: '' });
      setTransferStep('input');
      setIsTransferModalOpen(true);
      setShowBulkActions(false);
  };

  const handleBulkDelete = () => {
      if (confirm(`Are you sure you want to delete ${selectedProductIds.size} products?`)) {
          deleteProducts(Array.from(selectedProductIds));
          setSelectedProductIds(new Set());
          setShowBulkActions(false);
      }
  };

  const handleBulkUpdate = (e: React.FormEvent) => {
      e.preventDefault();
      Array.from(selectedProductIds).forEach(id => {
          const p = products.find(prod => prod.id === id);
          if (p) {
              const updated = { ...p };
              if (bulkForm.supplier) updated.supplier = bulkForm.supplier;
              if (bulkForm.status) updated.status = bulkForm.status as any;
              updateProduct(updated);
          }
      });
      setIsBulkEditModalOpen(false);
      setSelectedProductIds(new Set());
      setBulkForm({ supplier: '', status: '' });
  };

  const handleTransferSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (transferStep === 'input') {
        if (transferData.fromLoc === transferData.toLoc) { 
            alert("Source and Destination cannot be the same."); 
            return; 
        }
        if (!transferData.qty || transferData.qty <= 0) {
            alert("Please enter a valid quantity.");
            return;
        }
        
        // Check for single product stock
        if (!transferData.isBulk) {
            const p = products.find(prod => prod.id === transferData.productId);
            const available = p?.stock[transferData.fromLoc] || 0;
            if (available < transferData.qty) {
                 // We don't block here anymore, we proceed to allow the system to log a FAILED transaction
                 if(!confirm(`Warning: Insufficient stock. Available: ${available}. Proceeding will result in a failed transaction log. Continue?`)) {
                     return;
                 }
            }
        }
        setTransferStep('confirm');
    } else {
        try {
            if (!transferData.isBulk) {
                transferStock(transferData.productId, transferData.fromLoc, transferData.toLoc, Number(transferData.qty), transferData.notes);
            } else {
                Array.from(selectedProductIds).forEach(id => {
                    transferStock(id, transferData.fromLoc, transferData.toLoc, Number(transferData.qty), transferData.notes);
                });
                setSelectedProductIds(new Set());
            }
            setTransferStatus('success');
            setTimeout(() => { 
                setTransferStatus('idle'); 
                setIsTransferModalOpen(false); 
                setTransferStep('input'); 
            }, 1500);
        } catch (error) {
            setTransferStatus('error');
            setTransferError("Transfer failed due to system error.");
        }
    }
  };

  const openEditModal = (p: Product) => {
      setEditingProduct(p);
      setProductForm({ 
          ...p, 
          stockInputs: {...p.stock}, 
          minStockInputs: {...p.minStockThresholds}
      });
      setIsProductModalOpen(true);
  };

  const openAddModal = () => {
      setEditingProduct(null);
      setProductForm({
          name: '', sku: '', category: '', price: 0, cost: 0, taxRate: 18, stockInputs: {}, minStockInputs: {}, status: 'Active', supplier: '', barcode: ''
      });
      setIsProductModalOpen(true);
  };

  const handleProductSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      const pData: Product = {
          id: editingProduct ? editingProduct.id : `prod-${Date.now()}`,
          name: productForm.name || 'New Product',
          sku: productForm.sku || '',
          category: productForm.category || 'General',
          price: Number(productForm.price),
          cost: Number(productForm.cost),
          hsnCode: productForm.hsnCode || '0000',
          taxRate: Number(productForm.taxRate),
          minStockLevel: Number(productForm.minStockLevel || 10),
          minStockThresholds: productForm.minStockInputs || {},
          leadTimeDays: 7,
          stock: productForm.stockInputs || {},
          supplier: productForm.supplier,
          status: productForm.status as any || 'Active',
          barcode: productForm.barcode,
          expiryDate: productForm.expiryDate
      };
      
      // Initialize stock for all locations if missing
      locations.forEach(l => { if (pData.stock[l.id] === undefined) pData.stock[l.id] = 0; });
      
      editingProduct ? updateProduct(pData) : addProduct(pData);
      setIsProductModalOpen(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      
      {/* 1. Header */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
              <h2 className="text-2xl font-bold text-slate-800">Inventory Management</h2>
              <p className="text-sm text-slate-500">Track stock, manage suppliers, and optimize supply chain.</p>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
              <button onClick={openAddModal} className="flex-1 md:flex-none bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg flex items-center justify-center space-x-2 shadow-sm transition-all">
                  <Plus size={18}/><span>Add Product</span>
              </button>
              <button onClick={() => { setTransferData(d => ({...d, isBulk: false, productId: products[0]?.id, qty: 0, notes: ''})); setIsTransferModalOpen(true); }} className="flex-1 md:flex-none bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-5 py-2.5 rounded-lg flex items-center justify-center space-x-2 shadow-sm transition-all">
                  <ArrowRightLeft size={18}/><span>Transfer</span>
              </button>
          </div>
      </div>

      {/* Metrics Cards Omitted for brevity (same as previous) */}
      
      {/* 3. Filter & Organization Panel */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                  <Search className="absolute left-3 top-2.5 text-slate-400" size={18}/>
                  <input 
                    type="text" 
                    placeholder="Search by product name, SKU, or barcode..." 
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow" 
                    value={searchTerm} 
                    onChange={e=>setSearchTerm(e.target.value)} 
                  />
              </div>
              
              <div className="flex items-center bg-slate-100 rounded-lg p-1">
                  {['all', 'soon', 'expired', 'safe'].map(opt => (
                      <button 
                        key={opt}
                        onClick={() => setExpiryFilter(opt as any)}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-colors ${expiryFilter === opt ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                          {opt === 'soon' ? 'Expiring' : (opt === 'safe' ? 'No Expiry' : opt)}
                      </button>
                  ))}
              </div>

              {selectedProductIds.size > 0 && (
                  <div className="relative animate-in fade-in">
                      <button onClick={() => setShowBulkActions(!showBulkActions)} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 font-medium">
                          <CheckSquare size={16}/> {selectedProductIds.size} Selected <ChevronDown size={16}/>
                      </button>
                      
                      {showBulkActions && (
                          <div className="absolute top-full right-0 mt-2 w-48 bg-white border border-slate-200 rounded-lg shadow-xl z-20 overflow-hidden">
                              <button onClick={handleBulkTransfer} className="w-full text-left px-4 py-3 hover:bg-slate-50 text-sm flex items-center gap-2 text-slate-700 border-b border-slate-100">
                                  <ArrowRightLeft size={16}/> Transfer Stock
                              </button>
                              <button onClick={() => {setIsBulkEditModalOpen(true); setShowBulkActions(false);}} className="w-full text-left px-4 py-3 hover:bg-slate-50 text-sm flex items-center gap-2 text-slate-700 border-b border-slate-100">
                                  <Edit size={16}/> Edit Details
                              </button>
                              <button onClick={handleBulkDelete} className="w-full text-left px-4 py-3 hover:bg-red-50 text-sm flex items-center gap-2 text-red-600">
                                  <Trash2 size={16}/> Delete Products
                              </button>
                          </div>
                      )}
                  </div>
              )}
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="relative">
                  <MapPin className="absolute left-3 top-2.5 text-slate-400" size={16}/>
                  <select className="w-full pl-9 py-2 border border-slate-300 rounded-lg outline-none bg-white text-sm" value={selectedLocation} onChange={e=>setSelectedLocation(e.target.value)}>
                      <option value="all">All Locations (Consolidated)</option>
                      {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
              </div>
              <div className="relative">
                  <Truck className="absolute left-3 top-2.5 text-slate-400" size={16}/>
                  <select className="w-full pl-9 py-2 border border-slate-300 rounded-lg outline-none bg-white text-sm" value={selectedSupplier} onChange={e=>setSelectedSupplier(e.target.value)}>
                      <option value="all">All Suppliers</option>
                      {suppliers.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
              </div>
              <div className="relative">
                  <Tag className="absolute left-3 top-2.5 text-slate-400" size={16}/>
                  <select className="w-full pl-9 py-2 border border-slate-300 rounded-lg outline-none bg-white text-sm" value={selectedCategory} onChange={e=>setSelectedCategory(e.target.value)}>
                      <option value="all">All Categories</option>
                      {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
              </div>
              <div className="relative">
                  <Filter className="absolute left-3 top-2.5 text-slate-400" size={16}/>
                  <select className="w-full pl-9 py-2 border border-slate-300 rounded-lg outline-none bg-white text-sm" value={sortOption} onChange={e=>setSortOption(e.target.value as any)}>
                      <option value="name">Name (A-Z)</option>
                      <option value="stockAsc">Stock (Low to High)</option>
                      <option value="stockDesc">Stock (High to Low)</option>
                      <option value="valueDesc">Value (High to Low)</option>
                  </select>
              </div>
          </div>
      </div>

      {/* 4. Products Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                      <tr>
                          <th className="px-4 py-4 w-10">
                              <input 
                                type="checkbox" 
                                className="rounded border-slate-300 w-4 h-4 cursor-pointer"
                                checked={filteredProducts.length > 0 && selectedProductIds.size === filteredProducts.length} 
                                onChange={() => setSelectedProductIds(selectedProductIds.size === filteredProducts.length ? new Set() : new Set(filteredProducts.map(p=>p.id)))} 
                              />
                          </th>
                          <th className="px-4 py-4">Product Details</th>
                          <th className="px-4 py-4">Category / Supplier</th>
                          <th className="px-4 py-4">Status</th>
                          <th className="px-4 py-4 text-right">Unit Price</th>
                          <th className="px-4 py-4 text-center">Total Stock</th>
                          <th className="px-4 py-4 text-right">Actions</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                      {filteredProducts.map(p => {
                          const stock = getDisplayStock(p, selectedLocation);
                          const totalVal = stock * p.cost;
                          const lowStock = isLowStock(p, selectedLocation);
                          const deadStock = isDeadStock(p);
                          
                          return (
                              <tr key={p.id} className={`hover:bg-slate-50 transition-colors group ${deadStock ? 'bg-amber-50/30' : ''}`}>
                                  <td className="px-4 py-4">
                                      <input 
                                        type="checkbox" 
                                        className="rounded border-slate-300 w-4 h-4 cursor-pointer"
                                        checked={selectedProductIds.has(p.id)} 
                                        onChange={() => { const s = new Set(selectedProductIds); s.has(p.id)?s.delete(p.id):s.add(p.id); setSelectedProductIds(s); }} 
                                      />
                                  </td>
                                  <td className="px-4 py-4">
                                      <div className="font-semibold text-slate-900">{p.name}</div>
                                      <div className="text-xs text-slate-500 font-mono mt-0.5 flex items-center gap-2">
                                         <span>SKU: {p.sku || 'N/A'}</span>
                                         {p.barcode && <span className="bg-slate-100 px-1 rounded flex items-center gap-1"><ScanLine size={10}/> {p.barcode}</span>}
                                         {deadStock && <span className="bg-amber-100 text-amber-700 px-1 rounded flex items-center gap-1 text-[10px] font-bold">DEAD STOCK</span>}
                                      </div>
                                  </td>
                                  <td className="px-4 py-4">
                                      <div className="text-slate-800">{p.category}</div>
                                      <div className="text-xs text-slate-500">{p.supplier || 'Unknown Supplier'}</div>
                                  </td>
                                  <td className="px-4 py-4">
                                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                          p.status === 'Active' ? 'bg-green-100 text-green-800' : 
                                          p.status === 'Seasonal' ? 'bg-purple-100 text-purple-800' : 
                                          'bg-slate-100 text-slate-600'
                                      }`}>
                                          {p.status}
                                      </span>
                                  </td>
                                  <td className="px-4 py-4 text-right">
                                      <div className="font-medium text-slate-900">₹{p.price.toLocaleString()}</div>
                                      <div className="text-xs text-slate-400">Cost: ₹{p.cost}</div>
                                  </td>
                                  <td className="px-4 py-4 text-center">
                                      <div className={`font-bold flex items-center justify-center gap-1 ${lowStock ? 'text-red-600' : 'text-slate-800'}`}>
                                          {lowStock && <AlertTriangle size={14} className="text-red-500"/>}
                                          {stock.toLocaleString()}
                                      </div>
                                      <div className="text-xs text-slate-500">Value: ₹{totalVal.toLocaleString()}</div>
                                  </td>
                                  <td className="px-4 py-4 text-right">
                                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                          {deadStock && (
                                              <button onClick={() => handleDeadStockOptimize(p)} className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title="Optimize Dead Stock">
                                                  <Zap size={16}/>
                                              </button>
                                          )}
                                          <button onClick={() => openEditModal(p)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Edit">
                                              <Edit size={16}/>
                                          </button>
                                          <button onClick={() => setHistoryProductId(p.id)} className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors" title="History">
                                              <History size={16}/>
                                          </button>
                                      </div>
                                  </td>
                              </tr>
                          );
                      })}
                      {filteredProducts.length === 0 && (
                          <tr>
                              <td colSpan={7} className="px-6 py-12 text-center text-slate-400 bg-slate-50/50">
                                  <Box size={48} className="mx-auto mb-3 opacity-20"/>
                                  <p>No products found matching your filters.</p>
                              </td>
                          </tr>
                      )}
                  </tbody>
              </table>
          </div>
      </div>

      {/* Transfer Modal - Enhanced Content */}
      {isTransferModalOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 animate-in zoom-in-95">
                  <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><ArrowRightLeft size={22} className="text-indigo-600"/> Transfer Stock</h3>
                  
                  {transferStatus === 'success' ? (
                      <div className="flex flex-col items-center py-8">
                          <div className="bg-green-100 p-3 rounded-full text-green-600 mb-3"><CheckCircle size={40}/></div>
                          <h4 className="text-lg font-bold text-green-800">Transfer Initiated</h4>
                          <p className="text-slate-500 text-center mt-1">Inventory levels have been updated.</p>
                      </div>
                  ) : (
                      <form onSubmit={handleTransferSubmit} className="space-y-4">
                          {!transferData.isBulk && (
                              <div className="bg-slate-50 p-3 rounded-lg border">
                                  <div className="text-xs text-slate-500 font-bold uppercase">Product</div>
                                  <div className="font-medium text-slate-800">{products.find(p=>p.id===transferData.productId)?.name}</div>
                              </div>
                          )}
                          {transferData.isBulk && (
                              <div className="bg-slate-50 p-3 rounded-lg border">
                                  <div className="text-xs text-slate-500 font-bold uppercase">Bulk Action</div>
                                  <div className="font-medium text-slate-800">{selectedProductIds.size} Items Selected</div>
                              </div>
                          )}

                          <div className="grid grid-cols-2 gap-4">
                              <div>
                                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Source</label>
                                  <select className="w-full border p-2 rounded-lg bg-white" value={transferData.fromLoc} onChange={e=>setTransferData({...transferData, fromLoc: e.target.value})}>
                                      {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                                  </select>
                              </div>
                              <div>
                                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Destination</label>
                                  <select className="w-full border p-2 rounded-lg bg-white" value={transferData.toLoc} onChange={e=>setTransferData({...transferData, toLoc: e.target.value})}>
                                      {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                                  </select>
                              </div>
                          </div>

                          <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Quantity to Transfer</label>
                              <input type="number" className="w-full border p-2.5 rounded-lg text-lg font-bold text-center outline-none focus:border-indigo-500" value={transferData.qty} onChange={e=>setTransferData({...transferData, qty: Number(e.target.value)})} min="1"/>
                          </div>

                          <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Transfer Reason / Notes</label>
                              <textarea className="w-full border p-2.5 rounded-lg text-sm outline-none focus:border-indigo-500 h-20" placeholder="e.g. Replenishment for weekend sale..." value={transferData.notes} onChange={e=>setTransferData({...transferData, notes: e.target.value})}></textarea>
                          </div>

                          <div className="flex gap-3 pt-2">
                              <button type="button" onClick={()=>setIsTransferModalOpen(false)} className="flex-1 py-2.5 border rounded-lg hover:bg-slate-50">Cancel</button>
                              <button type="submit" className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold">Confirm Transfer</button>
                          </div>
                      </form>
                  )}
              </div>
          </div>
      )}

      {/* History Modal - Update to show Status/Reason */}
      {historyProductId && (
         <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full p-0 overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[85vh]">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800">Stock History</h3>
                        <p className="text-sm text-slate-500">{products.find(p => p.id === historyProductId)?.name}</p>
                    </div>
                    <button onClick={() => setHistoryProductId(null)} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={20}/></button>
                </div>
                <div className="flex-1 overflow-y-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-500 font-medium sticky top-0 z-10 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-3">Date</th>
                                <th className="px-6 py-3">Type</th>
                                <th className="px-6 py-3">Details</th>
                                <th className="px-6 py-3">Status</th>
                                <th className="px-6 py-3 text-right">Qty</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {transfers
                                .filter(t => t.productId === historyProductId)
                                .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                .map(t => {
                                    const fromName = locations.find(l => l.id === t.fromLocationId)?.name || 'Unknown';
                                    const toName = locations.find(l => l.id === t.toLocationId)?.name || 'Unknown';
                                    return (
                                        <tr key={t.id} className="hover:bg-slate-50">
                                            <td className="px-6 py-3 text-slate-600 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    <Clock size={14} className="text-slate-400"/>
                                                    <div>
                                                        <div>{new Date(t.date).toLocaleDateString()}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-3">
                                                <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-bold">TRANSFER</span>
                                            </td>
                                            <td className="px-6 py-3 text-xs">
                                                <div className="font-medium text-slate-800">{fromName} → {toName}</div>
                                                <div className="text-slate-500 mt-0.5">{t.notes || t.reason || 'No notes'}</div>
                                            </td>
                                            <td className="px-6 py-3">
                                                {t.status === 'FAILED' ? 
                                                    <span className="text-red-600 font-bold text-xs" title={t.reason}>FAILED</span> :
                                                    <span className="text-green-600 font-bold text-xs">COMPLETED</span>
                                                }
                                            </td>
                                            <td className="px-6 py-3 text-right font-bold text-slate-800">
                                                {t.quantity}
                                            </td>
                                        </tr>
                                    );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
         </div>
      )}
      
      {/* Add Product Modal (Omitted for brevity, assumed same as previous) */}
      {/* ... */}
      
    </div>
  );
};
