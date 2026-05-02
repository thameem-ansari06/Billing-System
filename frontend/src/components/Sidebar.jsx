import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { ShoppingCart, ChevronDown, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { navConfig } from '../config/navConfig';

const ADMIN_BADGE_PATHS = ['/quotes', '/invoices'];

export default function Sidebar({ isMobile = false, closeMenu = () => {} }) {
  const { user } = useAuth() || {};
  const { cartCount, setIsOpen } = useCart() || {};
  const [notifCounts, setNotifCounts] = useState({ pending_quotes: 0, new_invoices: 0, total: 0 });
  
  // State for collapsible sections
  const [collapsedSections, setCollapsedSections] = useState({
    "SALES & BILLING": false,
    "FINANCE & COMPLIANCE": false,
  });

  const toggleSection = (category) => {
    if (category === "SALES & BILLING" || category === "FINANCE & COMPLIANCE") {
      setCollapsedSections(prev => ({
        ...prev,
        [category]: !prev[category]
      }));
    }
  };

  // Poll for admin notification counts every 30s
  useEffect(() => {
    if (!user?.token || !['admin', 'ceo'].includes(user?.role)) return;

    const fetchCounts = async () => {
      try {
        const res = await fetch('http://localhost:8000/api/quotes/notifications/count', {
          headers: { Authorization: `Bearer ${user.token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setNotifCounts(data);
        }
      } catch (e) {
        // Silently fail — don't crash sidebar on network error
      }
    };

    fetchCounts(); // Run immediately on mount
    const interval = setInterval(fetchCounts, 30000); // Then every 30s
    return () => clearInterval(interval);
  }, [user?.token, user?.role]);

  if (!user) return null;

  const role = user?.role;

  const linkStyle = ({ isActive }) => 
    `w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all font-medium ${
      isActive 
        ? 'bg-blue-600 shadow-md text-white' 
        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
    }`;

  // Filter config based on role
  const filteredConfig = navConfig.map(section => {
    const filteredItems = section.items.filter(item => 
      item.allowedRoles.includes(role)
    );
    return {
      ...section,
      items: filteredItems
    };
  }).filter(section => section.items.length > 0);

  const getBadgeCount = (path) => {
    if (!['admin', 'ceo'].includes(role)) return 0;
    if (path === '/quotes') return notifCounts.pending_quotes;
    if (path === '/invoices') return notifCounts.new_invoices;
    return 0;
  };

  return (
    <div className={`${isMobile ? 'w-full h-full' : 'hidden md:flex w-64'} bg-slate-950 text-white flex-col z-10 shadow-2xl border-r border-slate-800`}>
      <div className="p-6 text-2xl font-black tracking-tight text-white flex items-center gap-2 border-b border-slate-900">
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-lg">
          <span className="text-sm font-bold text-white">AR</span>
        </div>
        XBP
      </div>
      <nav className="flex-1 p-4 space-y-6 overflow-y-auto">
        {filteredConfig.map((section, index) => {
          const isCollapsible = section.category === "SALES & BILLING" || section.category === "FINANCE & COMPLIANCE";
          const isCollapsed = collapsedSections[section.category];
          
          return (
            <div key={index} className="space-y-2">
              <div 
                className={`flex items-center justify-between px-2 ${isCollapsible ? 'cursor-pointer' : ''}`}
                onClick={() => toggleSection(section.category)}
              >
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {section.category}
                </h3>
                {isCollapsible && (
                  <button className="text-slate-500 hover:text-slate-300 transition-colors">
                    {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                  </button>
                )}
              </div>
              
              {/* Show items if not collapsed */}
              {(!isCollapsible || !isCollapsed) && (
                <div className="space-y-1">
                  {section.items.map((item, i) => {
                    const badge = getBadgeCount(item.path);
                    return (
                      <NavLink 
                        key={i} 
                        to={item.path} 
                        onClick={closeMenu} 
                        className={linkStyle}
                      >
                        <item.icon size={20} />
                        <span className="flex-1">{item.title}</span>
                        {badge > 0 && (
                          <span className="relative flex h-5 w-5 items-center justify-center">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-5 w-5 bg-orange-500 text-white text-[10px] font-black items-center justify-center">
                              {badge > 9 ? '9+' : badge}
                            </span>
                          </span>
                        )}
                      </NavLink>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
        
        {/* Special Cart button for users */}
        {role === 'user' && (
          <div className="pt-2">
            <button
              onClick={() => { setIsOpen(true); closeMenu(); }}
              className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-lg transition-all font-medium text-slate-400 hover:bg-slate-800 hover:text-white"
            >
              <span className="flex items-center gap-3"><ShoppingCart size={20} /> My Cart</span>
              {cartCount > 0 && (
                <span className="bg-blue-600 text-white text-xs font-black w-5 h-5 rounded-full flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        )}
      </nav>
    </div>
  );
}