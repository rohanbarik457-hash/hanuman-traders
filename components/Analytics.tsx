
import React, { useMemo, useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line, AreaChart, Area, ComposedChart, Scatter, ScatterChart } from 'recharts';
import { analyzeBusinessTrends } from '../services/geminiService';
import { TrendingUp, DollarSign, Activity, Zap, Filter, Target, Package, ArrowDown, FileBarChart, CheckSquare, X, Printer, Truck, AlertTriangle, Layers, Clock, RotateCcw, LineChart as IconLineChart, BrainCircuit, Loader2, Star, CreditCard, Users } from 'lucide-react';
import { SalesTarget } from '../types';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export const Analytics: React.FC = () => {
  const { products, sales, locations, salesTargets, setSalesTarget, transfers, suppliers, customers } = useApp();
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeScenarios, setActiveScenarios] = useState<string[]>([]);
  
  // Advanced Analytics Modal
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [activeTab, setActiveTab] = useState<'Overview' | 'Category' | 'Supplier' | 'Transactions' | 'Critical' | 'Customer' | 'Custom'>('Overview');
  const [isTabLoading, setIsTabLoading] = useState(false);
  
  // Forecasting Main Modal
  const [showForecasting, setShowForecasting] = useState(false);
  const [selectedSkuForForecast, setSelectedSkuForForecast] = useState(products[0]?.id || '');
  const [forecastRange, setForecastRange] = useState<'1M' | '6M' | '1Y' | '5Y'>('6M');
  const [isForecastLoading, setIsForecastLoading] = useState(false);

  // --- Mock Loader for Tab Switching ---
  useEffect(() => {
      setIsTabLoading(true);
      const timer = setTimeout(() => setIsTabLoading(false), 200); 
      return () => clearTimeout(timer);
  }, [activeTab, showAdvanced]);

  useEffect(() => {
      setIsForecastLoading(true);
      const timer = setTimeout(() => setIsForecastLoading(false), 400); 
      return () => clearTimeout(timer);
  }, [selectedSkuForForecast, forecastRange, showForecasting]);


  // --- Helpers for Advanced Analytics ---

  const inventoryOverview = useMemo(() => {
    const totalItems = products.reduce((acc, p) => acc + Object.values(p.stock).reduce((a, b) => a + b, 0), 0);
    const totalValue = products.reduce((acc, p) => acc + (p.cost * Object.values(p.stock).reduce((a, b) => a + b, 0)), 0);
    const lowStockItems = products.filter(p => Object.values(p.stock).reduce((a, b) => a + b, 0) < p.minStockLevel).length;
    const activeSuppliers = new Set(products.map(p => p.supplier).filter(Boolean)).size;
    
    const totalTxns = sales.length + transfers.length;
    const addedItems = transfers.reduce((acc, t) => acc + t.quantity, 0); 
    const usedItems = sales.reduce((acc, s) => acc + s.items.reduce((sum, i) => sum + i.quantity, 0), 0);
    const avgItemValue = totalItems > 0 ? totalValue / totalItems : 0;

    return { totalItems, totalValue, lowStockItems, activeSuppliers, totalTxns, addedItems, usedItems, avgItemValue };
  }, [products, sales, transfers]);

  const categoryAnalysis = useMemo(() => {
     const cats: Record<string, { count: number, qty: number, value: number, lowStock: number }> = {};
     products.forEach(p => {
         if (!cats[p.category]) cats[p.category] = { count: 0, qty: 0, value: 0, lowStock: 0 };
         const stock = Object.values(p.stock).reduce((a,b)=>a+b,0);
         cats[p.category].count++;
         cats[p.category].qty += stock;
         cats[p.category].value += stock * p.cost;
         if (stock < p.minStockLevel) cats[p.category].lowStock++;
     });
     return Object.entries(cats).map(([name, data]) => ({ name, ...data }));
  }, [products]);

  const supplierDetailedAnalysis = useMemo(() => {
      // Merge with Supplier Type Data if available
      return suppliers.map(s => {
          const supProducts = products.filter(p => p.supplier === s.name);
          const totalStockValue = supProducts.reduce((acc, p) => acc + (p.cost * Object.values(p.stock).reduce((a,b)=>a+b,0)), 0);
          return {
              name: s.name,
              rating: s.rating,
              productsCount: supProducts.length,
              stockValue: totalStockValue,
              leadTime: Math.floor(Math.random() * 10 + 2), // Mock Lead Time
              defectRate: (Math.random() * 5).toFixed(1) // Mock Defect Rate
          };
      }).sort((a,b) => b.stockValue - a.stockValue);
  }, [products, suppliers]);

  const customerAnalysis = useMemo(() => {
      // Mock data for customer segmentation
      const newVsReturning = [
          { name: 'Returning', value: 65 },
          { name: 'New', value: 35 }
      ];
      
      // Top customers by spend
      const topCustomers = customers
          .sort((a,b) => b.totalPurchases - a.totalPurchases)
          .slice(0, 5)
          .map(c => ({ name: c.name, value: c.totalPurchases }));

      return { newVsReturning, topCustomers };
  }, [customers]);

  const transactionDailyVolume = useMemo(() => {
      const volume: Record<string, number> = {};
      sales.forEach(s => {
          const date = s.date;
          volume[date] = (volume[date] || 0) + 1;
      });
      return Object.entries(volume).map(([date, count]) => ({ date, count })).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()).slice(-14); // Last 14 days
  }, [sales]);

  const paymentMethodDistribution = useMemo(() => {
      const dist: Record<string, number> = {};
      sales.forEach(s => {
          dist[s.paymentMethod] = (dist[s.paymentMethod] || 0) + s.totalAmount;
      });
      return Object.entries(dist).map(([name, value]) => ({ name, value }));
  }, [sales]);

  const criticalStockAnalysis = useMemo(() => {
      return products
        .map(p => {
            const totalStock = Object.values(p.stock).reduce((a,b)=>a+b,0);
            // Simulated burn rate (sales per day)
            const burnRate = Math.max(0.5, Math.random() * 5); 
            const daysLeft = totalStock / burnRate;
            return {
                name: p.name,
                stock: totalStock,
                burnRate: burnRate.toFixed(1),
                daysLeft: Math.floor(daysLeft),
                status: daysLeft < 7 ? 'Critical' : (daysLeft < 14 ? 'Warning' : 'OK')
            };
        })
        .filter(p => p.daysLeft < 20)
        .sort((a,b) => a.daysLeft - b.daysLeft)
        .slice(0, 10);
  }, [products]);

  // Forecasting Logic
  const skuForecastData = useMemo(() => {
      const prod = products.find(p => p.id === selectedSkuForForecast);
      if (!prod) return [];
      
      const data = [];
      const today = new Date();
      let points = 5;
      let multiplier = 1;
      
      if (forecastRange === '1M') { points = 4; multiplier = 1; } // weeks
      if (forecastRange === '6M') { points = 6; multiplier = 30; } // months
      if (forecastRange === '1Y') { points = 12; multiplier = 30; } // months
      if (forecastRange === '5Y') { points = 5; multiplier = 365; } // years

      const baseSeed = (prod.name.length * 7) % 20; 
      
      for (let i = points; i > 0; i--) {
          const d = new Date(today.getTime() - i * multiplier * 24 * 60 * 60 * 1000);
          const salesVal = Math.max(0, Math.floor(baseSeed * 5 + Math.random() * 20 + (i*2)));
          data.push({ period: d.toLocaleDateString(undefined, {month:'short', year:'2-digit'}), sales: salesVal, type: 'Past' });
      }
      for (let i = 1; i <= points; i++) {
           const d = new Date(today.getTime() + i * multiplier * 24 * 60 * 60 * 1000);
           const trendFactor = i * (baseSeed % 2 === 0 ? 5 : -2); 
           const salesVal = Math.max(0, Math.floor(baseSeed * 5 + 30 + trendFactor + Math.random()*10));
           data.push({ period: d.toLocaleDateString(undefined, {month:'short', year:'2-digit'}), sales: salesVal, type: 'Future'});
      }
      return data;
  }, [selectedSkuForForecast, products, forecastRange]);

  const forecastAnalysis = useMemo(() => {
      if (skuForecastData.length === 0) return null;
      const futurePoints = skuForecastData.filter(d => d.type === 'Future').map(d => d.sales);
      const pastPoints = skuForecastData.filter(d => d.type === 'Past').map(d => d.sales);
      const avgFuture = futurePoints.reduce((a,b)=>a+b,0) / futurePoints.length || 0;
      const avgPast = pastPoints.reduce((a,b)=>a+b,0) / pastPoints.length || 0;
      const growth = ((avgFuture - avgPast) / avgPast) * 100;
      const variance = futurePoints.reduce((a,b) => a + Math.pow(b - avgFuture, 2), 0) / futurePoints.length;
      const volatility = Math.sqrt(variance);

      return {
          impact: growth > 0 ? `+${growth.toFixed(1)}%` : `${growth.toFixed(1)}%`,
          trend: growth > 5 ? 'Strong Upward Trend' : (growth < -5 ? 'Declining Demand' : 'Stable Demand'),
          strategy: growth > 5 
              ? ['Increase stock depth by 15%', 'Feature in weekend promotions', 'Bundle with slow-moving items']
              : (growth < -5 ? ['Initiate clearance sale', 'Reduce reorder quantity', 'Investigate competitor pricing'] : ['Maintain current stock levels', 'Monitor weekly sales closely']),
          risk: volatility > 10 ? 'High (Volatile)' : 'Low (Stable)',
          stockoutProb: growth > 10 ? 'High (>40%)' : 'Low (<10%)'
      };
  }, [skuForecastData]);

  const metrics = useMemo(() => {
    let totalRevenue = 0;
    let totalCOGS = 0; 
    sales.forEach(sale => {
      totalRevenue += sale.totalAmount;
      sale.items.forEach(item => {
        totalCOGS += item.cost * item.quantity;
      });
    });
    const grossProfit = totalRevenue - totalCOGS;
    const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
    const currentInventoryValue = products.reduce((acc, p) => acc + (p.cost * Object.values(p.stock).reduce((a, b) => a + b, 0)), 0);
    const inventoryTurnover = currentInventoryValue > 0 ? totalCOGS / currentInventoryValue : 0;
    return { totalRevenue, grossProfit, grossMargin, inventoryTurnover, currentInventoryValue };
  }, [products, sales]);

  const salesByLocation = useMemo(() => {
    const data: Record<string, number> = {};
    sales.forEach(s => {
      const locName = locations.find(l => l.id === s.locationId)?.name || 'Unknown';
      data[locName] = (data[locName] || 0) + s.totalAmount;
    });
    return Object.entries(data).map(([name, value]) => ({ name, value }));
  }, [sales, locations]);

  const salesByCategory = useMemo(() => {
    const data: Record<string, number> = {};
    sales.forEach(s => {
      s.items.forEach(item => {
        data[item.category] = (data[item.category] || 0) + (item.price * item.quantity);
      });
    });
    return Object.entries(data).map(([name, value]) => ({ name, value }));
  }, [sales]);

  const toggleScenario = (scenario: string) => {
    setActiveScenarios(prev => prev.includes(scenario) ? prev.filter(s => s !== scenario) : [...prev, scenario]);
  };

  const handleRunAnalysis = async () => {
    setIsAnalyzing(true);
    const result = await analyzeBusinessTrends({ ...metrics, topSellingCategories: salesByCategory.slice(0, 3) }, activeScenarios);
    const cleanResult = result.replace(/\*\*/g, '').replace(/##/g, '').split('\n').filter(l => l.trim().length > 0).slice(0, 4).join('. ');
    setAiAnalysis(cleanResult);
    setIsAnalyzing(false);
  };

  const transactionHistory = useMemo(() => {
      const saleTxns = sales.map(s => ({
          id: s.id,
          type: 'Sale',
          date: s.date,
          val: s.totalAmount,
          status: 'Completed'
      }));
      const enrichedTransfers = transfers.map(t => {
          const prod = products.find(p => p.id === t.productId);
          const val = prod ? prod.cost * t.quantity : 0;
          return {
               id: t.id,
               type: 'Transfer',
               date: t.date,
               val: val,
               status: t.status
          };
      });

      return [...saleTxns, ...enrichedTransfers].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [sales, transfers, products]);

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Advanced Analytics</h2>
          <p className="text-sm text-slate-500">Business performance and strategic insights</p>
        </div>
        <div className="flex flex-wrap gap-2">
            <button onClick={() => setShowAdvanced(true)} className="bg-slate-800 text-white hover:bg-slate-900 px-4 py-2.5 rounded-lg flex items-center space-x-2 shadow-sm transition-all hover:scale-105 active:scale-95">
                <FileBarChart size={18} />
                <span>Advanced Reports</span>
            </button>
            <button onClick={() => setShowForecasting(true)} className="bg-indigo-600 text-white hover:bg-indigo-700 px-4 py-2.5 rounded-lg flex items-center space-x-2 shadow-sm transition-all hover:scale-105 active:scale-95">
                <IconLineChart size={18} />
                <span>Forecasting</span>
            </button>
            <button onClick={handleRunAnalysis} disabled={isAnalyzing} className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-lg flex items-center space-x-2 transition-colors disabled:opacity-50 shadow-md hover:scale-105 active:scale-95">
                {isAnalyzing ? <span className="animate-pulse">Consulting AI...</span> : <><Zap size={18} /><span>Strategic Insights</span></>}
            </button>
        </div>
      </div>

      {/* Main Charts - Row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-2"><h3 className="text-sm font-medium text-slate-500">Gross Margin</h3><Activity size={16} className="text-blue-500" /></div>
          <p className="text-2xl font-bold text-slate-800">{metrics.grossMargin.toFixed(1)}%</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-2"><h3 className="text-sm font-medium text-slate-500">Inventory Value</h3><DollarSign size={16} className="text-indigo-500" /></div>
          <p className="text-2xl font-bold text-slate-800">₹{metrics.currentInventoryValue.toLocaleString()}</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-2"><h3 className="text-sm font-medium text-slate-500">Inv. Turnover</h3><Activity size={16} className="text-orange-500" /></div>
          <p className="text-2xl font-bold text-slate-800">{metrics.inventoryTurnover.toFixed(2)}x</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-2"><h3 className="text-sm font-medium text-slate-500">Est. Profit</h3><DollarSign size={16} className="text-emerald-500" /></div>
          <p className="text-2xl font-bold text-slate-800">₹{metrics.grossProfit.toLocaleString()}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm min-h-[300px]">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Sales by Location</h3>
          <ResponsiveContainer width="100%" height={250}><BarChart data={salesByLocation}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="name"/><YAxis/><Tooltip/><Bar dataKey="value" fill="#6366f1" radius={[4,4,0,0]}/></BarChart></ResponsiveContainer>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm min-h-[300px]">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Category Performance</h3>
            <ResponsiveContainer width="100%" height={250}><PieChart><Pie data={salesByCategory} cx="50%" cy="50%" innerRadius={60} outerRadius={80} fill="#8884d8" paddingAngle={5} dataKey="value">{salesByCategory.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}</Pie><Tooltip formatter={(value) => `₹${Number(value).toLocaleString()}`} /><Legend /></PieChart></ResponsiveContainer>
        </div>
      </div>

      {aiAnalysis && (
        <div className="bg-purple-50 border border-purple-100 p-6 rounded-xl animate-in fade-in slide-in-from-bottom-4 duration-500">
           <div className="flex items-center gap-2 mb-4"><div className="w-8 h-8 bg-purple-200 rounded-lg flex items-center justify-center"><Zap className="text-purple-700" size={18} /></div><h3 className="text-lg font-bold text-purple-900">Strategic Recommendations</h3></div>
           <p className="text-slate-700 leading-relaxed text-sm">{aiAnalysis}</p>
        </div>
      )}

      {/* --- MODAL 1: ADVANCED REPORTS --- */}
      {showAdvanced && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 overflow-y-auto animate-in fade-in duration-200">
              <div className="max-w-7xl mx-auto p-4 md:p-8 min-h-screen flex flex-col justify-center">
                  <div className="bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                    {/* Header */}
                    <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-white sticky top-0 z-10">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-600 rounded-lg text-white"><FileBarChart size={24}/></div>
                            <div><h2 className="text-2xl font-bold text-slate-900">Advanced Analytics Report</h2><p className="text-sm text-slate-500">Deep dive into operational metrics</p></div>
                        </div>
                        <button onClick={() => setShowAdvanced(false)} className="bg-slate-100 p-2 rounded-full hover:bg-slate-200 transition-colors"><X size={24} className="text-slate-700"/></button>
                    </div>

                    <div className="flex border-b border-slate-200 px-6 bg-slate-50 overflow-x-auto">
                        {['Overview', 'Category', 'Supplier', 'Transactions', 'Critical', 'Customer', 'Custom'].map(tab => (
                            <button key={tab} onClick={() => setActiveTab(tab as any)} className={`px-6 py-4 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${activeTab === tab ? 'border-indigo-600 text-indigo-700 bg-white' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
                                {tab}
                            </button>
                        ))}
                    </div>

                    <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50">
                        {isTabLoading ? (
                            <div className="flex justify-center items-center h-64"><Loader2 className="animate-spin text-indigo-600" size={40}/></div>
                        ) : (
                            <div className="animate-in slide-in-from-right-4 duration-300 w-full">
                                {/* OVERVIEW TAB */}
                                {activeTab === 'Overview' && (
                                    <div className="space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm"><p className="text-xs font-bold text-slate-400 uppercase mb-1">Total Items</p><h3 className="text-2xl font-bold text-slate-800">{inventoryOverview.totalItems.toLocaleString()}</h3></div>
                                            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm"><p className="text-xs font-bold text-slate-400 uppercase mb-1">Total Value</p><h3 className="text-2xl font-bold text-indigo-600">₹{inventoryOverview.totalValue.toLocaleString()}</h3></div>
                                            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm"><p className="text-xs font-bold text-slate-400 uppercase mb-1">Suppliers</p><h3 className="text-2xl font-bold text-slate-800">{inventoryOverview.activeSuppliers}</h3></div>
                                            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm"><p className="text-xs font-bold text-slate-400 uppercase mb-1">Txn Count</p><h3 className="text-2xl font-bold text-slate-800">{inventoryOverview.totalTxns}</h3></div>
                                        </div>
                                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                            <h3 className="font-bold text-slate-800 mb-4">Stock Value Distribution</h3>
                                            <div className="h-64 min-w-[500px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={categoryAnalysis}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="name"/><YAxis/><Tooltip/><Bar dataKey="value" fill="#8884d8" radius={[4,4,0,0]}/></BarChart></ResponsiveContainer></div>
                                        </div>
                                    </div>
                                )}

                                {/* CATEGORY TAB */}
                                {activeTab === 'Category' && (
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-fit">
                                            <h3 className="font-bold text-slate-800 mb-2">Detailed Category Breakdown</h3>
                                            {categoryAnalysis.map(c => (
                                                <div key={c.name} className="flex justify-between p-3 bg-slate-50 rounded-lg mb-2">
                                                    <span className="font-bold text-slate-800">{c.name}</span>
                                                    <span className="text-indigo-600 font-bold">₹{c.value.toLocaleString()}</span>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                                            <div className="h-80"><ResponsiveContainer width="100%" height="100%"><AreaChart data={categoryAnalysis}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="name"/><YAxis/><Tooltip/><Area type="monotone" dataKey="qty" stroke="#82ca9d" fill="#82ca9d" /></AreaChart></ResponsiveContainer></div>
                                        </div>
                                    </div>
                                )}

                                {/* SUPPLIER TAB */}
                                {activeTab === 'Supplier' && (
                                    <div className="space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            <div className="col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                                                <h3 className="font-bold text-slate-800 mb-4">Supplier Rating vs Lead Time</h3>
                                                <div className="h-72"><ResponsiveContainer width="100%" height="100%"><ScatterChart><CartesianGrid strokeDasharray="3 3"/><XAxis type="number" dataKey="leadTime" name="Lead Time" unit="days"/><YAxis type="number" dataKey="rating" name="Rating" domain={[0, 5]}/><Tooltip cursor={{strokeDasharray: '3 3'}} content={({active, payload}) => { if (active && payload && payload.length) { return (<div className="bg-white p-2 border rounded shadow text-xs"><p className="font-bold">{payload[0].payload.name}</p><p>Rating: {payload[0].value}</p><p>Lead Time: {payload[1].value} days</p></div>); } return null; }}/><Scatter name="Suppliers" data={supplierDetailedAnalysis} fill="#8884d8"><Cell fill="#6366f1" /></Scatter></ScatterChart></ResponsiveContainer></div>
                                            </div>
                                            <div className="space-y-4">
                                                {supplierDetailedAnalysis.slice(0,3).map((s,i) => (
                                                    <div key={i} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
                                                        <div className="absolute right-0 top-0 p-2 opacity-10"><Truck size={48}/></div>
                                                        <h4 className="font-bold text-slate-800">{s.name}</h4>
                                                        <div className="flex items-center gap-1 text-xs text-yellow-600 font-bold mb-2"><Star size={10} fill="currentColor"/> {s.rating} Rating</div>
                                                        <div className="text-xs text-slate-500">Stock Value: <span className="font-mono text-slate-800">₹{s.stockValue.toLocaleString()}</span></div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* TRANSACTIONS TAB */}
                                {activeTab === 'Transactions' && (
                                    <div className="space-y-6">
                                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                             <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                                                <h3 className="font-bold text-slate-800 mb-4">Daily Transaction Volume (Last 14 Days)</h3>
                                                <div className="h-64"><ResponsiveContainer width="100%" height="100%"><LineChart data={transactionDailyVolume}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="date" tickFormatter={(t) => new Date(t).getDate().toString()}/><YAxis/><Tooltip/><Line type="monotone" dataKey="count" stroke="#8884d8" strokeWidth={2} dot={{r:4}} /></LineChart></ResponsiveContainer></div>
                                             </div>
                                             <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                                                <h3 className="font-bold text-slate-800 mb-4">Payment Methods</h3>
                                                <div className="h-64"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={paymentMethodDistribution} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value"><Cell fill="#0088FE" /><Cell fill="#00C49F" /><Cell fill="#FFBB28" /></Pie><Tooltip formatter={(value) => `₹${Number(value).toLocaleString()}`} /><Legend /></PieChart></ResponsiveContainer></div>
                                             </div>
                                         </div>
                                        
                                        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                                            <div className="p-4 bg-slate-50 border-b font-bold text-slate-700">Recent Transactions</div>
                                            <table className="w-full text-left text-sm">
                                                <thead className="bg-white border-b"><tr><th className="p-3">ID</th><th className="p-3">Type</th><th className="p-3">Date</th><th className="p-3 text-right">Value</th><th className="p-3 text-center">Status</th></tr></thead>
                                                <tbody>
                                                    {transactionHistory.slice(0, 8).map((t, i) => (
                                                        <tr key={i} className="border-b last:border-0 hover:bg-slate-50"><td className="p-3 font-mono text-xs">{t.id}</td><td className="p-3"><span className={`px-2 py-1 rounded text-xs ${t.type==='Sale'?'bg-green-100 text-green-700':'bg-blue-100 text-blue-700'}`}>{t.type}</span></td><td className="p-3">{new Date(t.date).toLocaleDateString()}</td><td className="p-3 text-right font-bold">₹{t.val.toLocaleString()}</td><td className="p-3 text-center text-xs">{t.status}</td></tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                {/* CRITICAL ANALYSIS TAB */}
                                {activeTab === 'Critical' && (
                                    <div className="space-y-6">
                                        <div className="bg-red-50 border border-red-200 p-6 rounded-xl flex items-start gap-4">
                                            <div className="bg-red-100 p-3 rounded-full text-red-600"><AlertTriangle size={32}/></div>
                                            <div>
                                                <h3 className="text-lg font-bold text-red-900">System Health: Attention Required</h3>
                                                <p className="text-red-700 mt-1">Algorithm detected {criticalStockAnalysis.length} items with critical burn rates leading to potential stockouts within 7 days.</p>
                                            </div>
                                        </div>
                                        
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                            <div className="bg-white p-6 rounded-xl border border-slate-200">
                                                <h4 className="font-bold text-slate-800 mb-4">Stock Burn Rate Prediction</h4>
                                                <div className="h-64"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={criticalStockAnalysis} layout="vertical"><CartesianGrid stroke="#f5f5f5"/><XAxis type="number"/><YAxis dataKey="name" type="category" width={100} style={{fontSize:'10px'}}/><Tooltip/><Bar dataKey="stock" barSize={10} fill="#413ea0" name="Current Stock" /><Bar dataKey="daysLeft" barSize={10} fill="#ff7300" name="Days Left" /></ComposedChart></ResponsiveContainer></div>
                                            </div>
                                            
                                            <div className="bg-white p-6 rounded-xl border border-slate-200">
                                                <h4 className="font-bold text-slate-800 mb-4">At-Risk Items Detail</h4>
                                                <div className="space-y-2 overflow-y-auto max-h-64 pr-1">
                                                    {criticalStockAnalysis.map((p, i) => (
                                                        <div key={i} className="flex justify-between items-center p-2 border-b last:border-0 hover:bg-slate-50">
                                                            <div>
                                                                <div className="text-sm font-bold text-slate-700">{p.name}</div>
                                                                <div className="text-xs text-slate-500">Burn Rate: {p.burnRate}/day</div>
                                                            </div>
                                                            <div className="text-right">
                                                                <div className="text-sm font-bold text-red-600">{p.daysLeft} Days Left</div>
                                                                <div className="text-[10px] text-slate-400">Stock: {p.stock}</div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* CUSTOMER TAB */}
                                {activeTab === 'Customer' && (
                                    <div className="space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                                                <h3 className="font-bold text-slate-800 mb-4">Customer Retention</h3>
                                                <div className="h-64"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={customerAnalysis.newVsReturning} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value"><Cell fill="#4f46e5" /><Cell fill="#10b981" /></Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer></div>
                                            </div>
                                            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                                                <h3 className="font-bold text-slate-800 mb-4">Top Customers by Revenue</h3>
                                                <div className="h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={customerAnalysis.topCustomers} layout="vertical"><CartesianGrid strokeDasharray="3 3"/><XAxis type="number"/><YAxis dataKey="name" type="category" width={100} style={{fontSize:'10px'}}/><Tooltip formatter={(val)=>`₹${val.toLocaleString()}`}/><Bar dataKey="value" fill="#f59e0b" barSize={20} radius={[0,4,4,0]}/></BarChart></ResponsiveContainer></div>
                                            </div>
                                        </div>
                                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                                             <h3 className="font-bold text-slate-800 mb-4">Customer Insights</h3>
                                             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                 <div className="p-4 bg-slate-50 rounded-lg text-center">
                                                     <p className="text-xs text-slate-500 uppercase font-bold">Avg Order Value</p>
                                                     <p className="text-xl font-bold text-slate-800">₹{(sales.reduce((a,s)=>a+s.totalAmount,0)/sales.length || 0).toFixed(0)}</p>
                                                 </div>
                                                 <div className="p-4 bg-slate-50 rounded-lg text-center">
                                                     <p className="text-xs text-slate-500 uppercase font-bold">Active Customers</p>
                                                     <p className="text-xl font-bold text-slate-800">{customers.length}</p>
                                                 </div>
                                                 <div className="p-4 bg-slate-50 rounded-lg text-center">
                                                     <p className="text-xs text-slate-500 uppercase font-bold">Engagement</p>
                                                     <p className="text-xl font-bold text-green-600">High</p>
                                                 </div>
                                             </div>
                                        </div>
                                    </div>
                                )}
                                
                                {/* CUSTOM TAB */}
                                {activeTab === 'Custom' && (
                                    <div className="bg-white p-8 rounded-xl border border-slate-200 text-center">
                                        <Layers size={48} className="mx-auto text-indigo-200 mb-4"/>
                                        <h3 className="text-lg font-bold text-slate-700">Custom Report Builder</h3>
                                        <p className="text-slate-500 mb-6 max-w-md mx-auto">Select metrics and dimensions to build your own view. This feature allows exporting specific datasets.</p>
                                        
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 text-left max-w-2xl mx-auto">
                                            <label className="flex items-center space-x-2 border p-3 rounded-lg cursor-pointer hover:bg-slate-50"><input type="checkbox" className="rounded text-indigo-600"/> <span className="text-sm">Revenue</span></label>
                                            <label className="flex items-center space-x-2 border p-3 rounded-lg cursor-pointer hover:bg-slate-50"><input type="checkbox" className="rounded text-indigo-600"/> <span className="text-sm">Profit Margin</span></label>
                                            <label className="flex items-center space-x-2 border p-3 rounded-lg cursor-pointer hover:bg-slate-50"><input type="checkbox" className="rounded text-indigo-600"/> <span className="text-sm">Stock Levels</span></label>
                                            <label className="flex items-center space-x-2 border p-3 rounded-lg cursor-pointer hover:bg-slate-50"><input type="checkbox" className="rounded text-indigo-600"/> <span className="text-sm">Customer Churn</span></label>
                                        </div>
                                        
                                        <button className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg hover:bg-indigo-700 font-bold shadow-md transition-all active:scale-95">Generate Custom Report</button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                  </div>
              </div>
          </div>
      )}

      {/* --- MODAL 2: FORECASTING (Main) --- */}
      {showForecasting && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 overflow-y-auto animate-in fade-in duration-300">
              <div className="max-w-6xl mx-auto p-4 md:p-8 min-h-screen flex flex-col justify-center">
                  <div className="bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                       <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-white">
                           <div className="flex items-center gap-3">
                               <div className="bg-indigo-600 p-2.5 rounded-xl text-white shadow-lg shadow-indigo-200"><BrainCircuit size={28}/></div>
                               <div>
                                   <h2 className="text-2xl font-bold text-slate-900">AI Demand Forecasting</h2>
                                   <p className="text-sm text-slate-500">Predictive analysis for business growth</p>
                               </div>
                           </div>
                           <button onClick={() => setShowForecasting(false)} className="bg-white p-2 rounded-full hover:bg-slate-100 border border-slate-200 transition-colors"><X size={24} className="text-slate-700"/></button>
                       </div>

                       <div className="p-6 md:p-8 overflow-y-auto bg-slate-50/50">
                           {/* Controls */}
                           <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                               <div className="flex items-center gap-4 w-full md:w-auto">
                                   <label className="text-sm font-bold text-slate-700">Select Product:</label>
                                   <select className="border-slate-300 border p-2.5 rounded-lg text-sm bg-slate-50 font-medium outline-none focus:ring-2 focus:ring-indigo-500 min-w-[200px]" value={selectedSkuForForecast} onChange={e=>setSelectedSkuForForecast(e.target.value)}>
                                       {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                   </select>
                               </div>
                               
                               <div className="flex bg-slate-100 p-1 rounded-lg">
                                   {['1M', '6M', '1Y', '5Y'].map(r => (
                                       <button key={r} onClick={() => setForecastRange(r as any)} className={`px-4 py-1.5 text-sm font-bold rounded-md transition-all ${forecastRange === r ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                                           {r}
                                       </button>
                                   ))}
                               </div>
                           </div>

                           {isForecastLoading ? (
                               <div className="h-96 flex flex-col items-center justify-center bg-white rounded-xl border border-slate-200">
                                   <Loader2 size={48} className="animate-spin text-indigo-600 mb-4"/>
                                   <p className="text-slate-500 font-medium">Running predictive models...</p>
                               </div>
                           ) : (
                               <div className="animate-in fade-in zoom-in-95 duration-300 space-y-6">
                                   {/* Main Chart */}
                                   <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                                       <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                                           <IconLineChart size={20} className="text-indigo-600"/> 
                                           Demand Trajectory: {products.find(p=>p.id===selectedSkuForForecast)?.name}
                                       </h3>
                                       <div className="h-80 w-full">
                                           <ResponsiveContainer width="100%" height="100%">
                                               <AreaChart data={skuForecastData}>
                                                   <defs>
                                                       <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                                           <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                                                           <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                                                       </linearGradient>
                                                   </defs>
                                                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                                                   <XAxis dataKey="period" tick={{fontSize: 12}}/>
                                                   <YAxis tick={{fontSize: 12}}/>
                                                   <Tooltip contentStyle={{borderRadius: '8px', border:'none', boxShadow:'0 10px 15px -3px rgb(0 0 0 / 0.1)'}}/>
                                                   <Legend iconType="circle"/>
                                                   <Area type="monotone" dataKey="sales" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" name="Sales Unit Projection" activeDot={{r: 6, strokeWidth: 0}} />
                                               </AreaChart>
                                           </ResponsiveContainer>
                                       </div>
                                   </div>

                                   {/* Dynamic Details & Strategy based on Forecast Analysis */}
                                   {forecastAnalysis && (
                                       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                           <div className="bg-white p-6 rounded-xl border border-indigo-100 shadow-sm relative overflow-hidden">
                                               <div className="absolute top-0 right-0 p-4 opacity-10"><Target size={64} className="text-indigo-600"/></div>
                                               <h4 className="text-indigo-900 font-bold uppercase text-xs mb-2">Business Impact</h4>
                                               <div className={`text-3xl font-bold mb-1 ${forecastAnalysis.impact.startsWith('-') ? 'text-red-600' : 'text-indigo-600'}`}>
                                                   {forecastAnalysis.impact}
                                               </div>
                                               <p className="text-sm text-slate-600">Expected revenue change from this SKU over next {forecastRange}.</p>
                                               <div className="mt-4 pt-4 border-t border-indigo-50 flex items-center gap-2 text-xs font-bold text-indigo-700">
                                                   <TrendingUp size={14}/> {forecastAnalysis.trend}
                                               </div>
                                           </div>

                                           <div className="bg-white p-6 rounded-xl border border-emerald-100 shadow-sm relative overflow-hidden">
                                                <div className="absolute top-0 right-0 p-4 opacity-10"><Zap size={64} className="text-emerald-600"/></div>
                                               <h4 className="text-emerald-900 font-bold uppercase text-xs mb-2">Growth Strategy</h4>
                                               <ul className="space-y-2 text-sm text-slate-600 mt-2">
                                                   {forecastAnalysis.strategy.map((strat, i) => (
                                                       <li key={i} className="flex gap-2"><CheckSquare size={16} className="text-emerald-500 shrink-0"/> {strat}</li>
                                                   ))}
                                               </ul>
                                           </div>

                                           <div className="bg-white p-6 rounded-xl border border-amber-100 shadow-sm relative overflow-hidden">
                                                <div className="absolute top-0 right-0 p-4 opacity-10"><Activity size={64} className="text-amber-600"/></div>
                                               <h4 className="text-amber-900 font-bold uppercase text-xs mb-2">Risk Analysis</h4>
                                               <div className="space-y-3 mt-2">
                                                   <div>
                                                       <div className="flex justify-between text-xs font-bold text-slate-700 mb-1"><span>Stockout Probability</span><span>{forecastAnalysis.stockoutProb}</span></div>
                                                       <div className="w-full bg-slate-100 rounded-full h-1.5"><div className={`h-1.5 rounded-full ${forecastAnalysis.stockoutProb.includes('High') ? 'bg-red-500 w-3/4' : 'bg-green-500 w-1/4'}`}></div></div>
                                                   </div>
                                                    <div>
                                                       <div className="flex justify-between text-xs font-bold text-slate-700 mb-1"><span>Volatility</span><span>{forecastAnalysis.risk}</span></div>
                                                       <div className="w-full bg-slate-100 rounded-full h-1.5"><div className={`h-1.5 rounded-full ${forecastAnalysis.risk.includes('High') ? 'bg-amber-500 w-3/4' : 'bg-blue-500 w-1/4'}`}></div></div>
                                                   </div>
                                               </div>
                                           </div>
                                       </div>
                                   )}
                               </div>
                           )}
                       </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
