import React, { useEffect, useState } from 'react';
import {
  ShoppingCart, Package, TrendingUp, Wallet, AlertTriangle,
  ArrowRight, Loader2, AlertCircle, ChevronRight,
  History, FileText, BookOpen, CreditCard, Headphones,
  LayoutDashboard, BadgeIndianRupee, Calendar,
} from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { API } from '../../config';

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (n) => parseFloat(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

// ── Invoice Status Badge Map ──────────────────────────────────────────────────
const INVOICE_STATUS = {
  Paid:    { cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  Pending: { cls: 'bg-amber-50  text-amber-700  border-amber-200',    dot: 'bg-amber-500'   },
  Overdue: { cls: 'bg-red-50    text-red-700    border-red-200',      dot: 'bg-red-500'     },
};

// ── Order Status Badge Map ────────────────────────────────────────────────────
const ORDER_STATUS = {
  Placed:     'bg-blue-50    text-blue-700   border-blue-200',
  Quoted:     'bg-amber-50   text-amber-700  border-amber-200',
  Invoiced:   'bg-purple-50  text-purple-700 border-purple-200',
  Dispatched: 'bg-orange-50  text-orange-700 border-orange-200',
  Delivered:  'bg-emerald-50 text-emerald-700 border-emerald-200',
};

// ── Status Badge UI ───────────────────────────────────────────────────────────
function StatusBadge({ status, map }) {
  const entry = map?.[status];
  const cls = entry?.cls || entry || 'bg-slate-100 text-slate-500 border-slate-200';
  const dot = entry?.dot;
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[9px] font-bold uppercase tracking-wider ${cls}`}>
      {dot && <span className={`w-1 h-1 rounded-full ${dot}`} />}
      {status}
    </span>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function CustomerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [orders,   setOrders]   = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [profile,  setProfile]  = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);

  useEffect(() => {
    if (!user?.token) return;
    const headers = { Authorization: `Bearer ${user.token}` };

    Promise.all([
      axios.get(`${API}/users/me`,             { headers }),
      axios.get(`${API}/orders/user/orders/`,  { headers }),
      // Invoices endpoint — returns array with {invoice_number, total_amount, status, created_at}
      axios.get(`${API}/invoices`,             { headers }).catch(() => ({ data: [] })),
    ])
      .then(([profileRes, ordersRes, invoicesRes]) => {
        setProfile(profileRes.data);
        setOrders(ordersRes.data   || []);
        // Backend returns { invoices: [...] } — extract the array safely
        const rawInvoices = invoicesRes.data;
        const invoiceArr = Array.isArray(rawInvoices)
          ? rawInvoices
          : Array.isArray(rawInvoices?.invoices)
            ? rawInvoices.invoices
            : [];
        setInvoices(invoiceArr);
      })
      .catch((err) => {
        console.error('Dashboard load error', err);
        setError('Failed to load dashboard data.');
      })
      .finally(() => setLoading(false));
  }, [user]);

  // ── Loading State ─────────────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 bg-slate-50 rounded-3xl">
      <div className="relative">
        <div className="w-14 h-14 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
        <Package className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-indigo-600" size={22} />
      </div>
      <p className="font-black text-slate-400 uppercase tracking-widest text-[10px]">Preparing your dashboard...</p>
    </div>
  );

  // ── Error State ───────────────────────────────────────────────────────────
  if (error) return (
    <div className="min-h-[40vh] flex flex-col items-center justify-center gap-3 text-red-500 bg-red-50 rounded-3xl p-8 text-center">
      <AlertCircle size={40} />
      <p className="font-bold">{error}</p>
      <button onClick={() => window.location.reload()} className="text-xs font-black uppercase tracking-widest text-indigo-600">
        Try Refreshing
      </button>
    </div>
  );

  // ── Derived Metrics ───────────────────────────────────────────────────────
  const displayName   = profile?.full_name || profile?.username || user?.username || 'Customer';
  const totalOrders   = orders.length;
  const totalSpent    = orders.reduce((s, o) => s + (o.total_amount || 0), 0);
  const walletBalance = profile?.wallet_balance || 0;

  // Pending dues: sum of all Overdue/Pending invoices
  const pendingInvoices = invoices.filter(inv => inv.status === 'Pending' || inv.status === 'Overdue');
  const totalDues = pendingInvoices.reduce((s, inv) => s + (inv.total_amount || 0), 0);
  const overdueCount = invoices.filter(inv => inv.status === 'Overdue').length;

  // Recent 5 invoices for the activity table
  const recentInvoices = [...invoices]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 5);

  // Recent 5 orders for the orders mini-table
  const recentOrders = [...orders]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 5);

  // ── Stat Cards Config ─────────────────────────────────────────────────────
  const statCards = [
    {
      id: 'orders',
      label: 'Total Orders',
      value: totalOrders,
      icon: ShoppingCart,
      iconBg: 'bg-indigo-50',
      iconText: 'text-indigo-600',
      accent: 'border-l-indigo-500',
    },
    {
      id: 'investment',
      label: 'Total Investment',
      value: `₹${fmt(totalSpent)}`,
      icon: TrendingUp,
      iconBg: 'bg-emerald-50',
      iconText: 'text-emerald-600',
      accent: 'border-l-emerald-500',
    },
    {
      id: 'wallet',
      label: 'Wallet Balance',
      value: `₹${fmt(walletBalance)}`,
      icon: Wallet,
      iconBg: 'bg-violet-50',
      iconText: 'text-violet-600',
      accent: 'border-l-violet-500',
    },
    {
      id: 'dues',
      label: 'Pending Dues',
      value: `₹${fmt(totalDues)}`,
      icon: AlertTriangle,
      iconBg: overdueCount > 0 ? 'bg-red-100' : 'bg-amber-50',
      iconText: overdueCount > 0 ? 'text-red-600' : 'text-amber-600',
      accent: overdueCount > 0 ? 'border-l-red-500' : 'border-l-amber-400',
      isDues: true,
    },
  ];

  // ── Quick Actions Config ──────────────────────────────────────────────────
  const quickActions = [
    {
      id: 'catalog',
      label: 'Browse Products',
      desc: 'Explore catalog',
      emoji: '📦',
      path: '/customer/catalog',
      color: 'from-indigo-50 to-indigo-100 hover:from-indigo-100 hover:to-indigo-200 border-indigo-200',
      textColor: 'text-indigo-700',
    },
    {
      id: 'orders',
      label: 'Order History',
      desc: 'Track purchases',
      emoji: '📋',
      path: '/customer/orders',
      color: 'from-slate-50 to-slate-100 hover:from-slate-100 hover:to-slate-200 border-slate-200',
      textColor: 'text-slate-700',
    },
    {
      id: 'invoices',
      label: 'GST Statements',
      desc: 'Download invoices',
      emoji: '📄',
      path: '/customer/invoices',
      color: 'from-emerald-50 to-emerald-100 hover:from-emerald-100 hover:to-emerald-200 border-emerald-200',
      textColor: 'text-emerald-700',
    },
    {
      id: 'wallet',
      label: 'Top-Up Wallet',
      desc: 'Add funds',
      emoji: '💳',
      path: '/customer/profile',
      color: 'from-violet-50 to-violet-100 hover:from-violet-100 hover:to-violet-200 border-violet-200',
      textColor: 'text-violet-700',
    },
  ];

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4 max-w-7xl mx-auto animate-in fade-in duration-500 pb-8">

      {/* ── Welcome Banner ──────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-xl bg-slate-900 px-5 py-4 text-white shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Background orbs */}
        <div className="absolute -top-8 -right-8 w-28 h-28 rounded-full bg-indigo-500/15 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-6 -left-6 w-20 h-20 rounded-full bg-violet-500/10 blur-xl pointer-events-none" />

        <div className="relative z-10 flex items-center gap-3">
          <div className="hidden sm:flex w-10 h-10 rounded-lg bg-white/8 border border-white/10 items-center justify-center flex-shrink-0">
            <LayoutDashboard size={18} className="text-indigo-400" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight leading-tight">
              Welcome back,{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-indigo-300">
                {displayName}
              </span>
            </h1>
            <p className="text-slate-400 text-[10px] font-medium mt-0.5 leading-tight">
              Real-time AR tracking · Automated GST billing · 24/7 support
            </p>
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-2">
          {overdueCount > 0 && (
            <span className="flex items-center gap-1 bg-red-500/20 border border-red-500/30 text-red-300 text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-md">
              <AlertTriangle size={9} />
              {overdueCount} Overdue
            </span>
          )}
          <button
            onClick={() => navigate('/customer/catalog')}
            className="group flex items-center gap-1 bg-indigo-600 text-white font-bold px-3 py-1.5 rounded-lg text-[11px] shadow hover:bg-indigo-700 transition-all active:scale-95 whitespace-nowrap"
          >
            Shop Now <ArrowRight size={11} className="group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>

      {/* ── 3-Column Main Layout ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* ── LEFT PANEL (col-span-2) ──────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">

          {/* 4 Metric Cards */}
          <div className="space-y-1.5">
            <h2 className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-0.5">
              Account Overview
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {statCards.map((card) => {
                const Icon = card.icon;
                return (
                  <div
                    key={card.id}
                    className={`
                      relative bg-white rounded-xl border border-slate-200 border-l-4 shadow-sm
                      p-3 flex flex-col gap-2 transition-all hover:shadow-md group
                      ${card.accent}
                      ${card.isDues && overdueCount > 0 ? 'ring-1 ring-red-200 bg-red-50/30' : ''}
                    `}
                  >
                    {/* Icon + Label */}
                    <div className="flex items-center justify-between">
                      <p className="text-[8.5px] font-black text-slate-400 uppercase tracking-widest leading-none">
                        {card.label}
                      </p>
                      <div className={`w-6 h-6 rounded-md ${card.iconBg} ${card.iconText} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                        <Icon size={12} />
                      </div>
                    </div>

                    {/* Value */}
                    <p className={`text-base font-black leading-none tracking-tight ${card.isDues && overdueCount > 0 ? 'text-red-700' : 'text-slate-800'}`}>
                      {card.value}
                    </p>

                    {/* Dues card: inline Pay Dues CTA */}
                    {card.isDues && totalDues > 0 && (
                      <button
                        onClick={() => navigate('/customer/invoices')}
                        className="mt-0.5 inline-flex items-center gap-0.5 text-[8px] font-black uppercase tracking-widest text-red-600 hover:text-red-800 transition-colors"
                      >
                        Pay Dues <ArrowRight size={8} />
                      </button>
                    )}

                    {/* Dues card: zero state */}
                    {card.isDues && totalDues === 0 && (
                      <p className="text-[8px] font-bold text-emerald-500 uppercase tracking-wider">
                        ✓ All Clear
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Invoices Table */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between px-0.5">
              <h2 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                Recent Invoice Activity
              </h2>
              <button
                onClick={() => navigate('/customer/invoices')}
                className="text-[8.5px] font-black text-indigo-600 uppercase tracking-widest hover:text-indigo-800 flex items-center gap-0.5 transition-colors"
              >
                View All <ChevronRight size={10} />
              </button>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              {recentInvoices.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2 text-slate-300">
                  <FileText size={28} strokeWidth={1.5} />
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No invoices yet</p>
                </div>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="py-2 px-3 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Invoice ID</th>
                      <th className="py-2 px-3 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                      <th className="py-2 px-3 text-right text-[9px] font-black text-slate-400 uppercase tracking-widest">Amount</th>
                      <th className="py-2 px-3 text-center text-[9px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentInvoices.map((inv, i) => (
                      <tr
                        key={inv.id || i}
                        className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors"
                      >
                        <td className="py-2 px-3 font-bold text-slate-800 text-[11px]">
                          {inv.invoice_number || `#${inv.id}`}
                        </td>
                        <td className="py-2 px-3 text-slate-400 text-[10px] font-medium">
                          {fmtDate(inv.created_at)}
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-slate-800 text-[11px]">
                          ₹{fmt(inv.total_amount)}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <StatusBadge status={inv.status} map={INVOICE_STATUS} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Recent Orders Mini-Table */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between px-0.5">
              <h2 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                Recent Orders
              </h2>
              <button
                onClick={() => navigate('/customer/orders')}
                className="text-[8.5px] font-black text-indigo-600 uppercase tracking-widest hover:text-indigo-800 flex items-center gap-0.5 transition-colors"
              >
                View All <ChevronRight size={10} />
              </button>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              {recentOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2 text-slate-300">
                  <Package size={28} strokeWidth={1.5} />
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No orders placed yet</p>
                  <button
                    onClick={() => navigate('/customer/catalog')}
                    className="mt-1 text-[9px] font-black text-indigo-600 uppercase tracking-widest hover:text-indigo-800 flex items-center gap-0.5"
                  >
                    Start Shopping <ArrowRight size={9} />
                  </button>
                </div>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="py-2 px-3 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Order</th>
                      <th className="py-2 px-3 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest hidden sm:table-cell">Date</th>
                      <th className="py-2 px-3 text-right text-[9px] font-black text-slate-400 uppercase tracking-widest">Amount</th>
                      <th className="py-2 px-3 text-center text-[9px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.map((order) => (
                      <tr
                        key={order.id}
                        className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors"
                      >
                        <td className="py-2 px-3 font-bold text-slate-800 text-[11px]">#{order.id}</td>
                        <td className="py-2 px-3 text-slate-400 text-[10px] font-medium hidden sm:table-cell">
                          {fmtDate(order.created_at)}
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-slate-800 text-[11px]">
                          ₹{fmt(order.total_amount)}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <StatusBadge status={order.status} map={ORDER_STATUS} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* ── RIGHT SIDEBAR (col-span-1) ───────────────────────────────── */}
        <div className="space-y-4">

          {/* Quick Actions 2×2 Grid */}
          <div className="space-y-1.5">
            <h2 className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-0.5">
              Quick Actions
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {quickActions.map((action) => (
                <button
                  key={action.id}
                  onClick={() => navigate(action.path)}
                  className={`
                    group flex flex-col items-center justify-center gap-1.5 p-3
                    rounded-xl border bg-gradient-to-b text-center
                    hover:scale-105 active:scale-95 transition-all duration-200 shadow-sm hover:shadow-md
                    ${action.color}
                  `}
                >
                  <span className="text-2xl leading-none">{action.emoji}</span>
                  <div>
                    <p className={`text-[10px] font-black leading-tight ${action.textColor}`}>
                      {action.label}
                    </p>
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                      {action.desc}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Dues Alert Card (conditionally prominent) */}
          {totalDues > 0 && (
            <div className={`rounded-xl border p-3 shadow-sm space-y-2 ${overdueCount > 0 ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
              <div className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${overdueCount > 0 ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
                  <AlertTriangle size={14} />
                </div>
                <div>
                  <p className={`text-[11px] font-black ${overdueCount > 0 ? 'text-red-800' : 'text-amber-800'}`}>
                    {overdueCount > 0 ? `${overdueCount} Overdue Invoice${overdueCount > 1 ? 's' : ''}` : 'Payments Pending'}
                  </p>
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">
                    Total due: ₹{fmt(totalDues)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => navigate('/customer/invoices')}
                className={`w-full py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 ${
                  overdueCount > 0
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-amber-500 hover:bg-amber-600 text-white'
                }`}
              >
                Clear Dues →
              </button>
            </div>
          )}

          {/* Account Summary Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-3 space-y-2">
            <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
              Account Summary
            </h3>
            {[
              { label: 'Total Invoices',  value: invoices.length,                    icon: FileText,          color: 'text-indigo-500' },
              { label: 'Paid Invoices',   value: invoices.filter(i => i.status === 'Paid').length,   icon: BadgeIndianRupee, color: 'text-emerald-500' },
              { label: 'Pending',         value: invoices.filter(i => i.status === 'Pending').length, icon: Calendar,         color: 'text-amber-500'  },
              { label: 'Overdue',         value: overdueCount,                        icon: AlertTriangle,    color: 'text-red-500'    },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="flex items-center justify-between py-1 border-b border-slate-100 last:border-0">
                <div className="flex items-center gap-1.5">
                  <Icon size={11} className={color} />
                  <span className="text-[10px] font-bold text-slate-600">{label}</span>
                </div>
                <span className="text-[11px] font-black text-slate-800">{value}</span>
              </div>
            ))}
          </div>

          {/* Support Banner */}
          <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-xl p-4 text-white shadow-sm">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 bg-white/15 rounded-lg flex items-center justify-center flex-shrink-0">
                <Headphones size={15} />
              </div>
              <div>
                <p className="text-[11px] font-black leading-tight">Need Help?</p>
                <p className="text-[9px] text-indigo-200 font-medium leading-tight">
                  Support available 24/7
                </p>
              </div>
            </div>
            <p className="text-[9px] text-indigo-100 font-medium leading-relaxed mb-3">
              Our business account team is ready to assist with orders, billing disputes, and GST queries.
            </p>
            <button className="w-full py-1.5 bg-white text-indigo-700 font-black text-[10px] uppercase tracking-widest rounded-lg hover:bg-indigo-50 active:scale-95 transition-all">
              Contact Support
            </button>
          </div>

        </div>
        {/* ── END RIGHT SIDEBAR ─────────────────────────────────────────── */}
      </div>
    </div>
  );
}
