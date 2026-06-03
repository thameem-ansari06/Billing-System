import React, { useState, useEffect, useCallback } from 'react';
import {
  ShoppingBag, ArrowRight, Package, Truck,
  CheckCircle2, RefreshCw, FileText, Download,
  RotateCcw, MapPin, CreditCard, ChevronRight,
  AlertCircle, Boxes, BadgeIndianRupee, Search, X,
} from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { API } from '../../config';

// ── Formatters ────────────────────────────────────────────────────────────────
const fmt = (n) => parseFloat(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

// ── Status Configuration ──────────────────────────────────────────────────────
const STATUS_CFG = {
  Placed:     { badge: 'bg-blue-50/80    text-blue-700    border-blue-200/60',   dot: 'bg-blue-500',    label: 'Placed'     },
  Quoted:     { badge: 'bg-amber-50/80   text-amber-700   border-amber-200/60',  dot: 'bg-amber-500',   label: 'Quoted'     },
  Invoiced:   { badge: 'bg-purple-50/80  text-purple-700  border-purple-200/60', dot: 'bg-purple-500',  label: 'Invoiced'   },
  Dispatched: { badge: 'bg-orange-50/80  text-orange-700  border-orange-200/60', dot: 'bg-orange-500',  label: 'Dispatched' },
  Delivered:  { badge: 'bg-emerald-50/80 text-emerald-700 border-emerald-200/60',dot:'bg-emerald-500', label: 'Delivered'  },
};
const DEFAULT_BADGE = 'bg-slate-100 text-slate-600 border-slate-200';

// ── Shipping Timeline Steps ───────────────────────────────────────────────────
const TIMELINE_STEPS = ['Placed', 'Quoted', 'Invoiced', 'Dispatched', 'Delivered'];
const STEP_ICONS     = [ShoppingBag, FileText, BadgeIndianRupee, Truck, CheckCircle2];

// ── Status Badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const cfg = STATUS_CFG[status];
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[10px] font-bold uppercase tracking-wider ${cfg?.badge || DEFAULT_BADGE}`}>
      {cfg && <span className={`w-1 h-1 rounded-full ${cfg.dot} animate-pulse`} />}
      {status || 'Unknown'}
    </span>
  );
}

// ── Order Focus Panel ─────────────────────────────────────────────────────────
function OrderFocusPanel({ order, onClose, navigate }) {
  if (!order) return (
    <div className="bg-white rounded-xl border border-dashed border-slate-300/80 p-6 flex flex-col items-center justify-center text-center h-full min-h-[460px] transition-all">
      <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mb-3">
        <Package size={20} className="text-slate-300" strokeWidth={1.5} />
      </div>
      <h3 className="text-xs font-bold text-slate-500 mb-1">Select an Order</h3>
      <p className="text-[11px] text-slate-400 max-w-[200px] leading-relaxed">
        Click any order row in the table to display real-time tracking checkpoints, billing data, and actions.
      </p>
    </div>
  );

  const invoice       = order.invoices?.[0] || null;
  const activeStep    = TIMELINE_STEPS.indexOf(order.status);
  const items         = order.items || [];
  const paymentMethod = order.payment_method || (invoice ? 'Razorpay' : 'Wallet');

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 shadow-md flex flex-col overflow-hidden h-full transition-all">
      {/* Panel Header */}
      <div className="bg-slate-900 px-4 py-3 flex items-center justify-between border-b border-slate-800">
        <div>
          <p className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest leading-none">Selected Order</p>
          <h2 className="text-sm font-black text-white leading-tight mt-1">Order #{order.id}</h2>
          <p className="text-slate-500 text-[10px] mt-0.5 font-medium">{fmtDate(order.created_at)}</p>
        </div>
        <div className="flex items-center gap-1.5">
          <StatusBadge status={order.status} />
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-all active:scale-90"
            title="Close details"
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Scrollable Body */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100 text-xs">
        
        {/* Shipping Timeline */}
        <div className="p-4">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-3.5">Shipping Timeline</h3>
          <div className="relative pl-1">
            {/* Connecting line */}
            <div className="absolute left-[13px] top-2 bottom-2 w-0.5 bg-slate-100" />
            <div className="space-y-3">
              {TIMELINE_STEPS.map((step, i) => {
                const StepIcon = STEP_ICONS[i];
                const done    = i <= activeStep;
                const active  = i === activeStep;
                return (
                  <div key={step} className="flex items-center gap-3 relative">
                    {/* Node */}
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center z-10 flex-shrink-0 transition-all ${
                      done
                        ? active
                          ? 'bg-indigo-600 ring-2 ring-indigo-100 shadow-sm'
                          : 'bg-emerald-500'
                        : 'bg-white border border-slate-200'
                    }`}>
                      <StepIcon size={10} className={done ? 'text-white' : 'text-slate-400'} />
                    </div>
                    {/* Label */}
                    <div className="min-w-0">
                      <p className={`text-xs font-bold leading-none ${active ? 'text-indigo-600' : done ? 'text-slate-700' : 'text-slate-400'}`}>
                        {step}
                        {active && <span className="ml-1.5 text-[8px] bg-indigo-50 text-indigo-600 border border-indigo-200/50 px-1 rounded uppercase tracking-wider font-extrabold">Active</span>}
                      </p>
                      {done && !active && (
                        <p className="text-[9px] text-slate-400 mt-0.5 font-medium">Completed</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Invoice & Payment Info */}
        <div className="p-4 space-y-2">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Payment & Invoice</h3>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-slate-50 border border-slate-100 rounded-lg p-2">
              <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider leading-none mb-1">Invoice ID</p>
              <p className="text-xs font-bold text-slate-800 truncate">{invoice?.invoice_number || '—'}</p>
            </div>
            <div className="bg-slate-50 border border-slate-100 rounded-lg p-2">
              <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider leading-none mb-1">Payment Method</p>
              <p className="text-xs font-bold text-slate-800 truncate">{paymentMethod}</p>
            </div>
            <div className="bg-indigo-50/60 border border-indigo-100/50 rounded-lg p-2.5 col-span-2 flex items-center justify-between">
              <div>
                <p className="text-[9px] font-extrabold text-indigo-500 uppercase tracking-wider leading-none mb-1">Grand Total</p>
                <p className="text-lg font-black text-indigo-700">₹{fmt(order.total_amount)}</p>
              </div>
              <div className="text-right">
                <span className="text-[9px] font-extrabold text-indigo-600 bg-indigo-100/50 px-1.5 py-0.5 rounded-md border border-indigo-200/50">
                  {order.status === 'Delivered' ? 'PAID' : 'VERIFIED'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Items Breakdown */}
        {items.length > 0 && (
          <div className="p-4">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Items Ordered ({items.length})</h3>
            <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
              {items.map((item, i) => (
                <div key={i} className="flex items-center justify-between py-1.5 border-b border-slate-100 last:border-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-5 h-5 rounded bg-slate-50 border border-slate-100 flex items-center justify-center flex-shrink-0">
                      <Boxes size={10} className="text-slate-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-700 truncate leading-none mb-0.5">{item.product_name || item.name || `Item ${i + 1}`}</p>
                      <p className="text-[9px] text-slate-400 font-medium">Qty: {item.quantity || 1}</p>
                    </div>
                  </div>
                  <p className="text-xs font-bold text-slate-700 flex-shrink-0 ml-2">
                    ₹{fmt((item.price || 0) * (item.quantity || 1))}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="p-4 space-y-2">
          {invoice && (
            <button
              onClick={() => navigate('/customer/invoices')}
              className="w-full flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[11px] py-2 rounded-lg transition-all active:scale-[0.98] shadow-sm hover:shadow"
            >
              <Download size={12} /> Download Invoice PDF
            </button>
          )}
          <button
            onClick={() => navigate('/customer/catalog')}
            className="w-full flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] py-1.5 rounded-lg transition-all active:scale-[0.98] border border-slate-200/50"
          >
            <RotateCcw size={12} /> Reorder Items
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function CustomerOrders() {
  const { user }     = useAuth();
  const navigate     = useNavigate();
  const [orders,     setOrders]      = useState([]);
  const [loading,    setLoading]     = useState(true);
  const [error,      setError]       = useState(null);
  const [selected,   setSelected]    = useState(null);
  const [searchTerm, setSearchTerm]  = useState('');

  const fetchOrders = useCallback(() => {
    if (!user?.token) return;
    setLoading(true);
    setError(null);
    axios.get(`${API}/orders/user/orders/`, {
      headers: { Authorization: `Bearer ${user.token}` },
    })
      .then(res  => {
        const data = Array.isArray(res.data) ? res.data : [];
        setOrders(data);
      })
      .catch(() => setError('Unable to load order history. Please try again.'))
      .finally(() => setLoading(false));
  }, [user]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  // ── Derived Analytics ─────────────────────────────────────────────────────
  const inTransit     = orders.filter(o => o.status === 'Dispatched').length;
  const completed     = orders.filter(o => o.status === 'Delivered').length;
  const pendingCapital = orders
    .filter(o => ['Placed', 'Quoted', 'Invoiced'].includes(o.status))
    .reduce((s, o) => s + (o.total_amount || 0), 0);

  // ── Filtered Rows ─────────────────────────────────────────────────────────
  const filtered = orders.filter(o =>
    !searchTerm ||
    String(o.id).includes(searchTerm) ||
    (o.status || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (o.invoices?.[0]?.invoice_number || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ── Loading State ─────────────────────────────────────────────────────────
  if (loading) return (
    <div className="w-full min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3">
      <div className="relative">
        <div className="w-12 h-12 border-[3px] border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
        <ShoppingBag className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-indigo-600 animate-pulse" size={16} />
      </div>
      <p className="font-extrabold text-slate-400 uppercase tracking-widest text-[9px]">Retrieving your orders...</p>
    </div>
  );

  // ── Error State ───────────────────────────────────────────────────────────
  if (error) return (
    <div className="w-full min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3 text-center px-4">
      <AlertCircle size={36} className="text-red-400" strokeWidth={1.5} />
      <p className="text-sm font-black text-slate-700">{error}</p>
      <button
        onClick={fetchOrders}
        className="flex items-center gap-1.5 bg-indigo-600 text-white font-bold px-4 py-2 rounded-lg text-xs hover:bg-indigo-700 transition-all active:scale-[0.98]"
      >
        <RefreshCw size={12} className="animate-spin" /> Retry
      </button>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="w-full max-w-none px-4 py-4 bg-slate-50 min-h-screen space-y-4 animate-in fade-in duration-300">

      {/* ── Page Header & Integrated Toolbar ──────────────────────────── */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-3 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-indigo-600 text-white rounded-xl shadow flex items-center justify-center flex-shrink-0">
            <ShoppingBag size={16} />
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-900 tracking-tight leading-none">Order History</h1>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">Track, manage, and reorder your purchases</p>
          </div>
        </div>

        {/* Integrated Toolbar controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search bar inside header card to save page height */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
            <input
              type="text"
              placeholder="Search ID, status, invoice..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="bg-slate-50 hover:bg-slate-100/50 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-400 focus:border-indigo-400 focus:bg-white w-48 sm:w-56 shadow-inner transition-all"
            />
          </div>

          <span className="bg-slate-100/80 border border-slate-200/60 text-slate-600 font-extrabold px-2.5 py-1.5 rounded-lg text-[10px] uppercase tracking-wider">
            {orders.length} Total
          </span>
          
          <button
            onClick={fetchOrders}
            className="flex items-center justify-center w-7 h-7 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-lg transition-all active:scale-[0.95]"
            title="Refresh order data"
          >
            <RefreshCw size={12} />
          </button>
        </div>
      </div>

      {/* ── Compact Integrated Metrics Ribbon ─────────────────────────── */}
      <div className="bg-white border border-slate-200/80 rounded-xl divide-y sm:divide-y-0 sm:divide-x divide-slate-100 grid grid-cols-1 sm:grid-cols-3 shadow-sm">
        {/* Metric 1 */}
        <div className="p-3 flex items-center justify-between sm:justify-start gap-4">
          <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center flex-shrink-0 text-orange-500">
            <Truck size={16} />
          </div>
          <div>
            <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">In-Transit</p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-black text-slate-800 leading-none">{inTransit}</span>
              <span className="text-[10px] text-slate-400 font-medium">active shipments</span>
            </div>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="p-3 flex items-center justify-between sm:justify-start gap-4">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0 text-emerald-500">
            <CheckCircle2 size={16} />
          </div>
          <div>
            <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">Completed</p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-black text-slate-800 leading-none">{completed}</span>
              <span className="text-[10px] text-slate-400 font-medium">delivered orders</span>
            </div>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="p-3 flex items-center justify-between sm:justify-start gap-4">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0 text-indigo-500">
            <BadgeIndianRupee size={16} />
          </div>
          <div>
            <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">Pending Capital</p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-black text-slate-800 leading-none">₹{fmt(pendingCapital)}</span>
              <span className="text-[10px] text-slate-400 font-medium">held in process</span>
            </div>
          </div>
        </div>
      </div>



      {/* ── Dynamic Width High-Density Split Screen ────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-10 gap-4 w-full items-start">

        {/* ── LEFT PANEL: Order Table (Full width or 70% split dynamically) ── */}
        <div className={`${selected ? 'xl:col-span-7' : 'xl:col-span-10'} space-y-3 transition-all duration-300`}>
          {filtered.length === 0 ? (
            <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 flex flex-col items-center justify-center text-center gap-4 shadow-sm">
              <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center">
                <Package size={22} className="text-slate-300" strokeWidth={1.5} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-700 mb-0.5">
                  {searchTerm ? 'No matching orders found' : 'No order history yet'}
                </h3>
                <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                  {searchTerm ? 'Try adjusting your search criteria or clear the query.' : 'Browse our collection and place your first order to get started.'}
                </p>
              </div>
              {!searchTerm && (
                <button
                  onClick={() => navigate('/customer/catalog')}
                  className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2 rounded-lg text-xs transition-all active:scale-[0.98] shadow-sm"
                >
                  Browse Catalog <ArrowRight size={12} />
                </button>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  {/* Compact Table Head */}
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="py-2.5 px-3.5 text-[10px] font-black uppercase text-slate-400 tracking-wider">Order ID</th>
                      <th className="py-2.5 px-3.5 text-[10px] font-black uppercase text-slate-400 tracking-wider">Date</th>
                      <th className="py-2.5 px-3.5 text-[10px] font-black uppercase text-slate-400 tracking-wider hidden sm:table-cell">Invoice</th>
                      <th className="py-2.5 px-3.5 text-[10px] font-black uppercase text-slate-400 tracking-wider hidden md:table-cell">Items Preview</th>
                      <th className="py-2.5 px-3.5 text-[10px] font-black uppercase text-slate-400 tracking-wider hidden lg:table-cell">Payment</th>
                      <th className="py-2.5 px-3.5 text-[10px] font-black uppercase text-slate-400 tracking-wider">Status</th>
                      <th className="py-2.5 px-3.5 text-right text-[10px] font-black uppercase text-slate-400 tracking-wider">Total</th>
                      <th className="py-2.5 px-3.5 text-center text-[10px] font-black uppercase text-slate-400 tracking-wider">Actions</th>
                    </tr>
                  </thead>

                  {/* High Density Table Body */}
                  <tbody className="divide-y divide-slate-100">
                    {filtered.map((order) => {
                      const invoice   = order.invoices?.[0] || null;
                      const items     = order.items || [];
                      const itemLabel = items.length > 0
                        ? items.length === 1
                          ? (items[0].product_name || items[0].name || 'Item')
                          : `${items[0].product_name || items[0].name || 'Item'} +${items.length - 1}`
                        : '—';
                      const payment = order.payment_method || (invoice ? 'Razorpay' : 'Wallet');
                      const isActive = selected?.id === order.id;

                      return (
                        <tr
                          key={order.id}
                          className={`transition-all hover:bg-slate-50/50 group border-l-4 ${
                            isActive
                              ? 'bg-indigo-50/40 border-l-indigo-600'
                              : 'border-l-transparent'
                          }`}
                        >
                          {/* Order ID */}
                          <td className="py-2.5 px-3.5">
                            <span className="text-xs font-black text-slate-800">#{order.id}</span>
                          </td>

                          {/* Date */}
                          <td className="py-2.5 px-3.5">
                            <span className="text-xs font-semibold text-slate-500">{fmtDate(order.created_at)}</span>
                          </td>

                          {/* Invoice */}
                          <td className="py-2.5 px-3.5 hidden sm:table-cell">
                            {invoice ? (
                              <span className="inline-block text-[9px] font-bold text-slate-600 bg-slate-100 border border-slate-200/80 px-1.5 py-0.5 rounded">
                                {invoice.invoice_number}
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-300 italic font-medium">Pending</span>
                            )}
                          </td>

                          {/* Items Preview */}
                          <td className="py-2.5 px-3.5 hidden md:table-cell">
                            <span className="text-xs font-medium text-slate-600 max-w-[140px] block truncate">{itemLabel}</span>
                          </td>

                          {/* Payment Method */}
                          <td className="py-2.5 px-3.5 hidden lg:table-cell">
                            <div className="flex items-center gap-1 text-slate-500">
                              <CreditCard size={11} className="text-slate-400" />
                              <span className="text-xs font-medium">{payment}</span>
                            </div>
                          </td>

                          {/* Status */}
                          <td className="py-2.5 px-3.5">
                            <StatusBadge status={order.status} />
                          </td>

                          {/* Total */}
                          <td className="py-2.5 px-3.5 text-right">
                            <span className="text-xs font-extrabold text-slate-800">₹{fmt(order.total_amount)}</span>
                          </td>

                          {/* Row Actions */}
                          <td className="py-2.5 px-3.5">
                            <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => setSelected(order)}
                                className="flex items-center gap-0.5 text-[9px] font-extrabold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/50 px-2 py-1 rounded transition-all whitespace-nowrap"
                              >
                                <MapPin size={9} /> Track
                              </button>
                              <button
                                onClick={() => navigate('/customer/catalog')}
                                className="flex items-center gap-0.5 text-[9px] font-extrabold text-slate-500 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 px-2 py-1 rounded transition-all whitespace-nowrap"
                              >
                                <RotateCcw size={9} /> Reorder
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Table Footer */}
              <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <span>
                  Showing {filtered.length} of {orders.length} entries
                </span>
                <span className="flex items-center gap-1 lowercase normal-case tracking-normal font-semibold text-slate-400">
                  Click 'Track' button to reveal shipping details <ChevronRight size={10} className="text-indigo-400" />
                </span>
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT PANEL: Integrated Order Detail Panel (Rendered only on Track selection) ── */}
        {selected && (
          <div className="xl:col-span-3 animate-in slide-in-from-right duration-300">
            <OrderFocusPanel
              order={selected}
              onClose={() => setSelected(null)}
              navigate={navigate}
            />
          </div>
        )}

      </div>
    </div>
  );
}
