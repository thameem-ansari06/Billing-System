import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ShoppingCart, ChevronDown, ChevronRight, ChevronLeft, X, LayoutDashboard, LogOut } from 'lucide-react';
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
  
  const [isExpanded, setIsExpanded] = useState(false);
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

  const showFullText = isExpanded || isMobile;

  return (
    <div 
      style={{ willChange: "width" }}
      className={cn(
        "flex-col h-full bg-slate-950 text-slate-200 border-r border-slate-800 transition-[width] duration-300 ease-in-out shrink-0",
        isMobile ? "flex w-full" : cn("hidden md:flex", isExpanded ? "w-64" : "w-20")
      )}
    >
      {/* Brand Header */}
      <div className={cn(
        "flex items-center justify-between h-20 border-b border-slate-900/50 transition-[padding] duration-300 ease-in-out overflow-hidden",
        showFullText ? "pl-6 pr-4" : "pl-5 pr-0"
      )}>
        <div 
          onClick={() => !isExpanded && setIsExpanded(true)}
          className={cn("flex items-center gap-3", !isExpanded && "cursor-pointer")}
        >
          <img 
            src="/logo.png" 
            alt="Enterprise Hub Logo" 
            className="h-10 w-10 shrink-0 rounded-xl object-cover shadow-lg shadow-indigo-500/20" 
          />
          <div className={cn(
            "flex flex-col whitespace-nowrap transition-[opacity,max-width] duration-300 ease-in-out",
            showFullText ? "opacity-100 max-w-xs" : "opacity-0 max-w-0 overflow-hidden"
          )}>
            <span className="text-lg font-black tracking-tight text-white">Enterprise Hub</span>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Powered by XBP</span>
          </div>
        </div>
        
        {showFullText && !isMobile && (
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(false);
            }}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
        )}
      </div>

      <nav className="flex-1 px-4 py-6 space-y-8 overflow-y-auto custom-scrollbar">
        {filteredConfig.map((section, idx) => (
          <div key={idx} className="space-y-3">
            <div 
              className={cn(
                "flex items-center justify-between cursor-pointer group transition-[padding] duration-300 ease-in-out",
                showFullText ? "pl-2 pr-2" : "pl-[14px] pr-0"
              )}
              onClick={() => showFullText && toggleSection(section.category)}
            >
              <h3 className={cn(
                "text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] group-hover:text-slate-400 transition-[opacity,max-width] duration-300 ease-in-out whitespace-nowrap",
                showFullText ? "opacity-100 max-w-xs" : "opacity-0 max-w-0 overflow-hidden"
              )}>
                {section.category}
              </h3>
              {showFullText && (section.category === "SALES & BILLING" || section.category === "FINANCE & COMPLIANCE") && (
                <ChevronDown className={cn(
                  "h-3.5 w-3.5 text-slate-600 transition-transform duration-200 shrink-0",
                  collapsedSections[section.category] && "-rotate-90"
                )} />
              )}
            </div>

            {(!collapsedSections[section.category] || !showFullText) && (
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
                          "w-full h-11 flex items-center gap-3 relative overflow-hidden transition-[padding,background-color,color] duration-300 ease-in-out",
                          showFullText ? "pl-3 pr-3" : "pl-[14px] pr-0",
                          isActive 
                            ? "bg-slate-800 text-white font-bold shadow-sm" 
                            : "text-slate-400 hover:text-white hover:bg-slate-900/50"
                        )}
                      >
                        <item.icon className={cn(
                          "h-5 w-5 shrink-0 transition-colors",
                          isActive ? "text-indigo-400" : "text-slate-500 group-hover:text-slate-400"
                        )} />
                        <span className={cn(
                          "flex-1 text-sm text-left whitespace-nowrap transition-[opacity,max-width] duration-300 ease-in-out",
                          showFullText ? "opacity-100 max-w-xs" : "opacity-0 max-w-0 overflow-hidden"
                        )}>
                          {item.title}
                        </span>
                        {badge > 0 && (
                          <>
                            {/* Expanded Badge */}
                            <Badge 
                              variant="destructive" 
                              className={cn(
                                "h-5 px-1.5 min-w-[20px] justify-center text-[10px] font-black shrink-0 transition-all duration-300",
                                showFullText ? "opacity-100 scale-100" : "opacity-0 scale-0 w-0 overflow-hidden p-0"
                              )}
                            >
                              {badge > 9 ? '9+' : badge}
                            </Badge>
                            {/* Collapsed Badge */}
                            <span 
                              className={cn(
                                "absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[8px] font-black text-white shrink-0 shadow-lg border border-slate-950 transition-all duration-300 origin-top-right",
                                !showFullText ? "opacity-100 scale-100" : "opacity-0 scale-0 pointer-events-none"
                              )}
                            >
                              {badge > 9 ? '9+' : badge}
                            </span>
                          </>
                        )}
                        {isActive && (
                          <div className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-md bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]" />
                        )}
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
                className={cn(
                  "w-full h-12 border-slate-800 bg-slate-900/20 text-slate-300 hover:bg-slate-900 hover:text-white hover:border-slate-700 flex items-center gap-3 relative overflow-hidden transition-[padding,background-color,border-color,color] duration-300 ease-in-out group",
                  showFullText ? "pl-3 pr-3" : "pl-[14px] pr-0"
                )}
             >
                <div className="relative shrink-0">
                  <ShoppingCart className="h-5 w-5 text-indigo-400" />
                  {cartCount > 0 && (
                    <span className="absolute -top-2 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 text-[9px] font-black text-white">
                      {cartCount}
                    </span>
                  )}
                </div>
                <span className={cn(
                  "flex-1 text-sm font-bold text-left whitespace-nowrap transition-[opacity,max-width] duration-300 ease-in-out",
                  showFullText ? "opacity-100 max-w-xs" : "opacity-0 max-w-0 overflow-hidden"
                )}>
                  Shopping Cart
                </span>
                {showFullText && <ChevronRight className="h-4 w-4 text-slate-600 group-hover:translate-x-1 transition-transform shrink-0" />}
             </Button>
          </div>
        )}
      </nav>

      {/* Footer User Profile (Minimal) */}
      <div className="border-t border-slate-900/50 bg-slate-950/50 p-2 transition-all duration-300">
        <Button 
          variant="ghost" 
          className={cn(
            "w-full h-14 hover:bg-slate-900 flex items-center gap-3 relative overflow-hidden transition-[padding,background-color] duration-300 ease-in-out group",
            showFullText ? "pl-4" : "pl-[14px]"
          )}
          onClick={logout}
        >
          <div className="h-9 w-9 shrink-0 rounded-full bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center group-hover:bg-indigo-600/20 transition-colors">
            <LogOut className="h-4 w-4 text-indigo-400" />
          </div>
          <div className={cn(
            "flex flex-col items-start overflow-hidden text-left whitespace-nowrap transition-[opacity,max-width] duration-300 ease-in-out",
            showFullText ? "opacity-100 max-w-xs" : "opacity-0 max-w-0 overflow-hidden"
          )}>
            <span className="text-xs font-black text-white truncate w-32">{user.full_name || user.username}</span>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">{role}</span>
          </div>
        </Button>
      </div>
    </div>
  );
}
