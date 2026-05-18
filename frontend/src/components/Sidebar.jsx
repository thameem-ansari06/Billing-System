import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ShoppingCart, ChevronDown, ChevronRight, LayoutDashboard, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { usePermissions } from '../hooks/usePermissions';
import { navConfig } from '../config/navConfig';
import { API } from '../config';
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export default function Sidebar({ isMobile = false, closeMenu = () => {} }) {
  const { user, logout } = useAuth() || {};
  const { cartCount, setIsOpen } = useCart() || {};
  const { role, canEdit } = usePermissions();
  const location = useLocation();
  
  const [notifCounts, setNotifCounts] = useState({ pending_quotes: 0, new_invoices: 0, total: 0 });
  const [collapsedSections, setCollapsedSections] = useState({
    "SALES & BILLING": false,
    "FINANCE & COMPLIANCE": false,
  });

  const toggleSection = (category) => {
    setCollapsedSections(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  useEffect(() => {
    if (!user?.token || !['admin', 'ceo'].includes(role)) return;

    const fetchCounts = async () => {
      try {
        const res = await fetch(`${API}/quotes/notifications/count`, {
          headers: { Authorization: `Bearer ${user.token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setNotifCounts(data);
        }
      } catch (e) {}
    };

    fetchCounts();
    const interval = setInterval(fetchCounts, 30000);
    return () => clearInterval(interval);
  }, [user?.token, role]);

  if (!user) return null;

  const filteredConfig = navConfig.map(section => {
    const filteredItems = section.items.filter(item => 
      item.allowedRoles.includes(role)
    );
    return { ...section, items: filteredItems };
  }).filter(section => section.items.length > 0);

  const getBadgeCount = (path) => {
    if (!['admin', 'ceo'].includes(role)) return 0;
    if (path === '/quotes') return notifCounts.pending_quotes;
    if (path === '/invoices') return notifCounts.new_invoices;
    return 0;
  };

  return (
    <div className={cn(
      "flex-col h-full bg-slate-950 text-slate-200 border-r border-slate-800 transition-all duration-300",
      isMobile ? "flex w-full" : "hidden md:flex w-72"
    )}>
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-6 h-20 border-b border-slate-900/50">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 shadow-lg shadow-indigo-500/20">
          <span className="text-lg font-black text-white">AR</span>
        </div>
        <div className="flex flex-col">
          <span className="text-lg font-black tracking-tight text-white">Enterprise Hub</span>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Powered by XBP</span>
        </div>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-8 overflow-y-auto custom-scrollbar">
        {filteredConfig.map((section, idx) => (
          <div key={idx} className="space-y-3">
            <div 
              className="flex items-center justify-between px-2 cursor-pointer group"
              onClick={() => toggleSection(section.category)}
            >
              <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] group-hover:text-slate-400 transition-colors">
                {section.category}
              </h3>
              {(section.category === "SALES & BILLING" || section.category === "FINANCE & COMPLIANCE") && (
                <ChevronDown className={cn(
                  "h-3.5 w-3.5 text-slate-600 transition-transform duration-200",
                  collapsedSections[section.category] && "-rotate-90"
                )} />
              )}
            </div>

            {!collapsedSections[section.category] && (
              <div className="space-y-1">
                {section.items.map((item, i) => {
                  const isActive = location.pathname === item.path;
                  const badge = getBadgeCount(item.path);
                  
                  return (
                    <NavLink 
                      key={i} 
                      to={item.path} 
                      onClick={closeMenu}
                      className="block"
                    >
                      <Button
                        variant={isActive ? "secondary" : "ghost"}
                        className={cn(
                          "w-full justify-start gap-3 h-11 px-3 transition-all duration-200",
                          isActive 
                            ? "bg-slate-800 text-white font-bold shadow-sm" 
                            : "text-slate-400 hover:text-white hover:bg-slate-900/50"
                        )}
                      >
                        <item.icon className={cn(
                          "h-5 w-5",
                          isActive ? "text-indigo-400" : "text-slate-500 group-hover:text-slate-400"
                        )} />
                        <span className="flex-1 text-sm">{item.title}</span>
                        {badge > 0 && (
                          <Badge variant="destructive" className="h-5 px-1.5 min-w-[20px] justify-center text-[10px] font-black">
                            {badge > 9 ? '9+' : badge}
                          </Badge>
                        )}
                        {isActive && <div className="h-1.5 w-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]" />}
                      </Button>
                    </NavLink>
                  );
                })}
              </div>
            )}
          </div>
        ))}

        {/* User Portal Contextual Action */}
        {(role === 'user' || role === 'customer') && (
          <div className="pt-4 space-y-3">
             <Separator className="bg-slate-800/50" />
             <Button
                onClick={() => { setIsOpen(true); closeMenu(); }}
                variant="outline"
                className="w-full justify-start gap-3 h-12 border-slate-800 bg-slate-900/20 text-slate-300 hover:bg-slate-900 hover:text-white hover:border-slate-700 transition-all group"
             >
                <div className="relative">
                  <ShoppingCart className="h-5 w-5 text-indigo-400" />
                  {cartCount > 0 && (
                    <span className="absolute -top-2 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 text-[9px] font-black text-white">
                      {cartCount}
                    </span>
                  )}
                </div>
                <span className="flex-1 text-sm font-bold">Shopping Cart</span>
                <ChevronRight className="h-4 w-4 text-slate-600 group-hover:translate-x-1 transition-transform" />
             </Button>
          </div>
        )}
      </nav>

      {/* Footer User Profile (Minimal) */}
      <div className="p-4 border-t border-slate-900/50 bg-slate-950/50">
        <Button 
          variant="ghost" 
          className="w-full justify-start gap-3 h-14 hover:bg-slate-900 px-3 group"
          onClick={logout}
        >
          <div className="h-9 w-9 rounded-full bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center group-hover:bg-indigo-600/20 transition-colors">
            <LogOut className="h-4 w-4 text-indigo-400" />
          </div>
          <div className="flex flex-col items-start overflow-hidden">
            <span className="text-xs font-black text-white truncate w-32">{user.full_name || user.username}</span>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">{role}</span>
          </div>
        </Button>
      </div>
    </div>
  );
}
