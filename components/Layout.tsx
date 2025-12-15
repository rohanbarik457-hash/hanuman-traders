
import React, { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { LayoutDashboard, Package, ShoppingCart, BarChart3, Bot, Settings, Menu, X, FileText, Users, Truck, ChevronLeft, ChevronRight } from 'lucide-react';
import { AIAgent } from './AIAgent'; // Import the new floating agent

const SidebarItem = ({ to, icon: Icon, label, collapsed }: { to: string, icon: any, label: string, collapsed: boolean }) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      `flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
        isActive ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'
      } ${collapsed ? 'justify-center px-2' : ''}`
    }
    title={collapsed ? label : ''}
  >
    <Icon size={20} />
    {!collapsed && <span className="font-medium animate-in fade-in duration-200">{label}</span>}
  </NavLink>
);

export const Layout: React.FC = () => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const location = useLocation();

  React.useEffect(() => {
    setIsMobileOpen(false);
  }, [location]);

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden relative">
      {/* Mobile Sidebar Overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`fixed lg:static inset-y-0 left-0 bg-white border-r border-slate-200 z-30 transform transition-all duration-300 ease-in-out flex flex-col ${
          isMobileOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0'
        } ${isSidebarCollapsed ? 'lg:w-20' : 'lg:w-64'}`}
      >
        <div className={`p-6 border-b border-slate-100 flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <Package className="text-white" size={20} />
            </div>
            {!isSidebarCollapsed && (
              <h1 className="text-xl font-bold text-slate-800 animate-in fade-in duration-200 whitespace-nowrap">Hanuman<span className="text-indigo-600">Trader</span></h1>
            )}
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto overflow-x-hidden">
          <SidebarItem to="/" icon={LayoutDashboard} label="Dashboard" collapsed={isSidebarCollapsed} />
          <SidebarItem to="/inventory" icon={Package} label="Inventory" collapsed={isSidebarCollapsed} />
          <SidebarItem to="/sales" icon={ShoppingCart} label="Sales & POS" collapsed={isSidebarCollapsed} />
          <SidebarItem to="/customers" icon={Users} label="Customers" collapsed={isSidebarCollapsed} />
          <SidebarItem to="/suppliers" icon={Truck} label="Suppliers" collapsed={isSidebarCollapsed} />
          <SidebarItem to="/gst-report" icon={FileText} label="Reports" collapsed={isSidebarCollapsed} />
          <SidebarItem to="/analytics" icon={BarChart3} label="Analytics" collapsed={isSidebarCollapsed} />
          <SidebarItem to="/settings" icon={Settings} label="Settings" collapsed={isSidebarCollapsed} />
        </nav>

        <div className="p-4 border-t border-slate-100">
          <div className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'space-x-3 px-4 py-2'}`}>
            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold flex-shrink-0">
              JD
            </div>
            {!isSidebarCollapsed && (
              <div className="animate-in fade-in duration-200">
                <p className="text-sm font-medium text-slate-700">John Doe</p>
                <p className="text-xs text-slate-500">Admin</p>
              </div>
            )}
          </div>
          {/* Collapse Toggle (Desktop only) */}
          <button 
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="hidden lg:flex w-full mt-4 items-center justify-center p-2 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors"
          >
            {isSidebarCollapsed ? <ChevronRight size={20}/> : <ChevronLeft size={20}/>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Mobile Header */}
        <header className="lg:hidden bg-white border-b border-slate-200 p-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
             <button 
                onClick={() => setIsMobileOpen(!isMobileOpen)}
                className="p-2 text-slate-600 hover:bg-slate-100 rounded-md"
              >
                {isMobileOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
             <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                  <Package className="text-white" size={20} />
                </div>
                <span className="font-bold text-slate-800">Hanuman Trader</span>
             </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 relative z-0">
          <div className="max-w-7xl mx-auto pb-20"> 
            <Outlet />
          </div>
        </main>

        {/* Floating AI Agent */}
        <AIAgent />
      </div>
    </div>
  );
};
