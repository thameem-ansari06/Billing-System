import React, { useEffect, useState } from 'react';
import { ShoppingCart, Package, TrendingUp, Clock, ArrowRight, Loader2, AlertCircle, ChevronRight, LayoutDashboard, History, FileText } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

import { API } from '../../config';
const fmt = (n) => parseFloat(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });

export default function CustomerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders]     = useState([]);
  const [profile, setProfile]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);

  useEffect(() => {
    if (!user?.token) return;
    const headers = { Authorization: `Bearer ${user.token}` };

    Promise.all([
      axios.get(`${API}/users/me`, { headers }),
      axios.get(`${API}/orders/user/orders/`, { headers }),
    ])
      .then(([profileRes, ordersRes]) => {
        setProfile(profileRes.data);
        setOrders(ordersRes.data || []);
      })
      .catch((err) => {
        console.error("Dashboard load error", err);
        setError('Failed to load dashboard data.');
      })
      .finally(() => setLoading(false));
  }, [user]);

  if (loading) return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 bg-slate-50 rounded-3xl">
      <div className="relative">
        <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
        <Package className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-indigo-600" size={24} />
      </div>
      <p className="font-black text-slate-400 uppercase tracking-widest text-[10px]">Preparing your dashboard...</p>
    </div>
  );

  if (error) return (
    <div className="min-h-[40vh] flex flex-col items-center justify-center gap-3 text-red-500 bg-red-50 rounded-3xl p-8 text-center">
      <AlertCircle size={40} />
      <p className="font-bold">{error}</p>
      <button onClick={() => window.location.reload()} className="text-xs font-black uppercase tracking-widest text-indigo-600">Try Refreshing</button>
    </div>
  );

  const totalOrders = orders.length;
  const totalSpent  = orders.reduce((s, o) => s + (o.total_amount || 0), 0);
  const displayName = profile?.full_name || profile?.username || user?.username || 'Customer';

  const statCards = [
    {
      label: 'Total Orders',
      value: totalOrders,
      icon: <ShoppingCart size={22} />,
      bg: 'bg-indigo-50',
      text: 'text-indigo-600',
    },
    {
      label: 'Total Investment',
      value: `₹${fmt(totalSpent)}`,
      icon: <TrendingUp size={22} />,
      bg: 'bg-emerald-50',
      text: 'text-emerald-600',
    },
    {
      label: 'Wallet Balance',
      value: `₹${fmt(profile?.wallet_balance)}`,
      icon: <LayoutDashboard size={22} />,
      bg: 'bg-amber-50',
      text: 'text-amber-600',
    },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-700 pb-20">

      {/* Premium Welcome Banner */}
      <div className="relative overflow-hidden rounded-xl bg-slate-900 p-6 text-white shadow-lg shadow-indigo-900/10">
        <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-indigo-500/10 blur-2xl" />
        <div className="absolute -bottom-8 -left-8 w-24 h-24 rounded-full bg-emerald-500/5 blur-xl" />

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="space-y-2 text-center md:text-left">
            <div>
              <p className="text-indigo-400 text-[9px] font-bold uppercase tracking-widest mb-1">Customer Portal</p>
              <h1 className="text-2xl font-bold tracking-tight">
                Hello, <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-indigo-300">{displayName}</span>
              </h1>
            </div>
            <p className="text-slate-400 font-medium text-xs max-w-md leading-snug">
              Experience seamless business procurement with real-time tracking and automated GST billing.
            </p>
            <div className="flex flex-wrap gap-2 justify-center md:justify-start pt-1">
              <button
                onClick={() => navigate('/customer/catalog')}
                className="group flex items-center gap-1.5 bg-indigo-600 text-white font-bold px-4 py-2 rounded-lg text-xs shadow-md shadow-indigo-600/20 hover:bg-indigo-700 transition-all active:scale-95"
              >
                Start Shopping <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
          
          <div className="hidden md:block">
             <div className="w-16 h-16 rounded-xl bg-white/5 backdrop-blur-md border border-white/10 flex items-center justify-center">
                <Package size={32} className="text-indigo-400" />
             </div>
          </div>
        </div>
      </div>

      {/* Layout Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Stats Column */}
        <div className="space-y-4">
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Account Overview</h3>
          <div className="grid grid-cols-1 gap-3">
            {statCards.map((card) => (
              <div key={card.label} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-center gap-4 hover:shadow-md transition-all group">
                <div className={`w-10 h-10 rounded-lg ${card.bg} ${card.text} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}>
                  {React.cloneElement(card.icon, { size: 16 })}
                </div>
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{card.label}</p>
                  <p className="text-lg font-bold text-slate-800 leading-tight">{card.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions Column */}
        <div className="space-y-4">
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Quick Navigation</h3>
          <div className="bg-white rounded-xl border border-slate-200 p-3 space-y-2 shadow-sm">
             <div className="grid grid-cols-1 gap-2">
                {[
                  { label: 'Order History', path: '/customer/orders', icon: <History size={16} className="text-indigo-500" />, desc: 'Track your deliveries & buy again' },
                  { label: 'My Invoices', path: '/customer/invoices', icon: <FileText size={16} className="text-emerald-500" />, desc: 'View and download GST invoices' },
                  { label: 'Product Catalog', path: '/customer/catalog', icon: <ShoppingCart size={16} className="text-amber-500" />, desc: 'Browse and order new products' },
                ].map(link => (
                  <button 
                    key={link.label}
                    onClick={() => navigate(link.path)}
                    className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-indigo-50 rounded-lg transition-all group border border-transparent hover:border-indigo-100"
                  >
                    <div className="flex items-center gap-3 text-left">
                       <div className="p-2 bg-white rounded-md shadow-sm group-hover:scale-110 transition-transform">
                          {link.icon}
                       </div>
                       <div>
                          <p className="font-bold text-slate-800 text-xs leading-tight">{link.label}</p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">{link.desc}</p>
                       </div>
                    </div>
                    <ChevronRight size={14} className="text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
                  </button>
                ))}
             </div>
          </div>
        </div>
      </div>

      {/* Mini Promotion Banner */}
      <div className="bg-gradient-to-r from-indigo-600 to-violet-700 rounded-xl p-4 text-white flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
         <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white/10 backdrop-blur-sm rounded-lg flex items-center justify-center">
               <LayoutDashboard size={16} />
            </div>
            <div>
               <p className="text-xs font-bold tracking-tight">Need help with your orders?</p>
               <p className="text-[10px] text-indigo-100">Our support team is available 24/7 for business accounts.</p>
            </div>
         </div>
         <button className="px-4 py-2 bg-white text-indigo-600 font-bold rounded-lg text-xs hover:scale-105 active:scale-95 transition-all">
            Contact Support
         </button>
      </div>

    </div>
  );
}
