import React, { useEffect, useState } from 'react';
import { ShoppingCart, Package, TrendingUp, Clock, ArrowRight, Loader2, AlertCircle, ChevronRight, LayoutDashboard, History, FileText } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const API = 'http://localhost:8000';
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
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-700 pb-20">

      {/* Premium Welcome Banner */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-slate-900 p-8 md:p-12 text-white shadow-2xl shadow-indigo-900/20">
        <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="absolute -bottom-12 -left-12 w-48 h-48 rounded-full bg-emerald-500/5 blur-2xl" />

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-4 text-center md:text-left">
            <div>
              <p className="text-indigo-400 text-[10px] font-black uppercase tracking-[0.2em] mb-2">Customer Portal</p>
              <h1 className="text-4xl md:text-5xl font-black tracking-tight">
                Hello, <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-indigo-300">{displayName}</span>
              </h1>
            </div>
            <p className="text-slate-400 font-medium text-sm md:text-base max-w-md leading-relaxed">
              Experience seamless business procurement with real-time tracking and automated GST billing.
            </p>
            <div className="flex flex-wrap gap-3 justify-center md:justify-start pt-2">
              <button
                onClick={() => navigate('/customer/catalog')}
                className="group flex items-center gap-2 bg-indigo-600 text-white font-black px-6 py-3.5 rounded-2xl text-sm shadow-xl shadow-indigo-600/20 hover:bg-indigo-700 transition-all hover:scale-105 active:scale-95"
              >
                Start Shopping <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
          
          <div className="hidden md:block">
             <div className="w-32 h-32 rounded-[2rem] bg-white/5 backdrop-blur-xl border border-white/10 flex items-center justify-center">
                <Package size={64} className="text-indigo-400" />
             </div>
          </div>
        </div>
      </div>

      {/* Layout Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Stats Column */}
        <div className="space-y-6">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest px-2">Account Overview</h3>
          <div className="grid grid-cols-1 gap-4">
            {statCards.map((card) => (
              <div key={card.label} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8 flex items-center gap-6 hover:shadow-md transition-all group">
                <div className={`w-16 h-16 rounded-2xl ${card.bg} ${card.text} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}>
                  {card.icon}
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{card.label}</p>
                  <p className="text-3xl font-black text-slate-800 mt-1">{card.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions Column */}
        <div className="space-y-6">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest px-2">Quick Navigation</h3>
          <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 space-y-4 shadow-sm">
             <div className="grid grid-cols-1 gap-3">
                {[
                  { label: 'Order History', path: '/customer/orders', icon: <History size={20} className="text-indigo-500" />, desc: 'Track your deliveries & buy again' },
                  { label: 'My Invoices', path: '/customer/invoices', icon: <FileText size={20} className="text-emerald-500" />, desc: 'View and download GST invoices' },
                  { label: 'Product Catalog', path: '/customer/catalog', icon: <ShoppingCart size={20} className="text-amber-500" />, desc: 'Browse and order new products' },
                ].map(link => (
                  <button 
                    key={link.label}
                    onClick={() => navigate(link.path)}
                    className="w-full flex items-center justify-between p-5 bg-slate-50 hover:bg-indigo-50 rounded-2xl transition-all group border border-transparent hover:border-indigo-100"
                  >
                    <div className="flex items-center gap-4 text-left">
                       <div className="p-3 bg-white rounded-xl shadow-sm group-hover:scale-110 transition-transform">
                          {link.icon}
                       </div>
                       <div>
                          <p className="font-bold text-slate-800 text-sm leading-tight">{link.label}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">{link.desc}</p>
                       </div>
                    </div>
                    <ChevronRight size={18} className="text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
                  </button>
                ))}
             </div>
          </div>
        </div>
      </div>

      {/* Mini Promotion Banner */}
      <div className="bg-gradient-to-r from-indigo-600 to-violet-700 rounded-[2rem] p-8 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl shadow-indigo-200">
         <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center">
               <LayoutDashboard size={24} />
            </div>
            <div>
               <p className="text-sm font-black tracking-tight">Need help with your orders?</p>
               <p className="text-xs text-indigo-100 opacity-80">Our support team is available 24/7 for business accounts.</p>
            </div>
         </div>
         <button className="px-6 py-3 bg-white text-indigo-600 font-black rounded-xl text-xs hover:scale-105 active:scale-95 transition-all">
            Contact Support
         </button>
      </div>

    </div>
  );
}
