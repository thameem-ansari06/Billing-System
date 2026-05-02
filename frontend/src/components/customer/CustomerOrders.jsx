import React, { useState, useEffect } from 'react';
import {
  ShoppingBag, Calendar, ChevronDown, ChevronUp, RotateCcw, FileDown,
  Loader2, AlertCircle, Package, CheckCircle2, Truck, MapPin, ClipboardList,
  Clock, ArrowRight, TrendingUp, Info
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import VerticalStepper from '../ui/VerticalStepper';
import { Button } from '@/components/ui/button';

const API = 'http://localhost:8000';
const fmt = (n) => parseFloat(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });

const STATUS_BADGE = {
  Placed:     'bg-blue-50 text-blue-600 border-blue-100',
  Quoted:     'bg-amber-50 text-amber-600 border-amber-100',
  Invoiced:   'bg-purple-50 text-purple-600 border-purple-100',
  Dispatched: 'bg-orange-50 text-orange-600 border-orange-100',
  Delivered:  'bg-emerald-50 text-emerald-600 border-emerald-100',
};

// ── Single Order Card ────────────────────────────────────────────────────────
function OrderCard({ order }) {
  const [expanded, setExpanded] = useState(false);
  const [task, setTask] = useState(null);
  const [loadingTask, setLoadingTask] = useState(false);
  const { reorderItems } = useCart();
  const { user } = useAuth();

  const invoice = order.invoices?.[0] || null;

  const fetchTask = async () => {
    if (task || loadingTask) return;
    setLoadingTask(true);
    try {
      const res = await axios.get(`${API}/api/delivery-tasks/by-order/${order.id}`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      setTask(res.data);
    } catch (err) {
      console.error("Failed to fetch task", err);
    } finally {
      setLoadingTask(false);
    }
  };

  useEffect(() => {
    let interval;
    if (expanded) {
      fetchTask();
      interval = setInterval(fetchTask, 15000); // Poll every 15s when expanded
    }
    return () => clearInterval(interval);
  }, [expanded]);

  const handleReorder = (e) => {
    e.stopPropagation();
    if (!order.order_items?.length) {
      toast.error('No items found in this order.');
      return;
    }
    reorderItems(order.order_items);
    toast.success('Items added to cart!');
  };

  const handleDownloadInvoice = async (e) => {
    e.stopPropagation();
    try {
      const res = await axios.get(`${API}/api/invoices/${invoice.id}/pdf`, {
        responseType: 'blob',
        headers: { Authorization: `Bearer ${user.token}` },
      });
      const url  = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href  = url;
      link.setAttribute('download', `Invoice_${invoice.invoice_number}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Invoice downloaded!');
    } catch {
      toast.error('Could not download invoice.');
    }
  };

  const timelineSteps = task ? [
    { title: 'Assigned', description: 'Driver assigned', timestamp: task.timestamp_logs?.ASSIGNED },
    { title: 'Picked Up', description: 'At warehouse', timestamp: task.timestamp_logs?.PICKED_UP },
    { title: 'In Transit', description: 'Out for delivery', timestamp: task.timestamp_logs?.IN_TRANSIT },
    { title: 'Arrived', description: 'At your location', timestamp: task.timestamp_logs?.ARRIVED },
    { title: 'Delivered', description: 'Handed over', timestamp: task.timestamp_logs?.DELIVERED }
  ] : [];

  return (
    <div className={`bg-white rounded-[2rem] border transition-all duration-500 overflow-hidden ${expanded ? 'border-indigo-200 shadow-xl shadow-indigo-100/50 ring-1 ring-indigo-50' : 'border-slate-100 shadow-sm hover:shadow-md'}`}>
      {/* Card Header */}
      <div
        className="p-6 flex flex-col md:flex-row md:items-center gap-6 cursor-pointer select-none"
        onClick={() => setExpanded(v => !v)}
      >
        <div className="flex items-center gap-4 flex-1">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 ${expanded ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 rotate-6' : 'bg-slate-50 text-slate-400 group-hover:bg-indigo-50'}`}>
            <ShoppingBag size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-black text-slate-800 text-lg tracking-tight">Order #{order.id}</h3>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border uppercase tracking-widest ${STATUS_BADGE[order.status] || 'bg-slate-100 text-slate-400'}`}>
                {order.status}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <p className="flex items-center gap-1.5 text-xs text-slate-400 font-bold uppercase tracking-tighter">
                <Calendar size={12} className="text-indigo-400" />
                {new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
              {invoice && (
                <span className="text-[9px] font-black uppercase tracking-widest border border-indigo-100 text-indigo-500 bg-indigo-50/50 px-2 py-0.5 rounded-md">
                  Tracking: {invoice.invoice_number}
                </span>
              )}
              {invoice?.delivery_tasks?.[0] && (
                <span className="text-[9px] font-black uppercase tracking-widest bg-emerald-500 text-white px-2 py-0.5 rounded-md">
                  {invoice.delivery_tasks[0].status}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-none pt-4 md:pt-0">
          <div className="text-right">
            <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Grand Total</p>
            <p className="text-2xl font-black text-slate-900 tracking-tighter">₹{fmt(order.total_amount)}</p>
          </div>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center border border-slate-100 text-slate-300 transition-all ${expanded ? 'rotate-180 bg-slate-900 text-white border-slate-900' : 'bg-white'}`}>
            <ChevronDown size={20} />
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="border-t border-slate-50 bg-slate-50/30 p-6 md:p-8 space-y-8 animate-in slide-in-from-top-4 duration-500">
          
          {/* Timeline Section */}
          <div className="bg-white rounded-3xl p-6 border border-indigo-100 shadow-sm space-y-6">
             <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-indigo-500 uppercase tracking-widest flex items-center gap-2">
                   <Truck size={14} /> Delivery Timeline {task?.invoice_number && `• Tracking ID: ${task.invoice_number}`}
                </h4>
                {loadingTask && <Loader2 size={16} className="animate-spin text-indigo-400" />}
             </div>

             {task ? (
                <VerticalStepper 
                  steps={timelineSteps} 
                  currentStep={timelineSteps.findLastIndex(s => s.timestamp !== undefined)} 
                />
             ) : loadingTask ? (
                <div className="py-8 text-center space-y-3">
                   <div className="w-8 h-8 border-2 border-indigo-100 border-t-indigo-500 rounded-full animate-spin mx-auto" />
                   <p className="text-[10px] font-bold text-slate-400 uppercase">Fetching live tracking...</p>
                </div>
             ) : (
                <div className="py-4 px-4 bg-slate-50 rounded-2xl flex items-center gap-3 text-slate-400 italic text-sm">
                   <Info size={16} />
                   <span>Tracking will be available once the order is dispatched.</span>
                </div>
             )}
          </div>

          {/* Items & Actions Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
             {/* Items */}
             <div className="space-y-4">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Items Detail</h4>
                <div className="space-y-2">
                   {order.order_items?.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-white rounded-2xl p-4 border border-slate-100 shadow-sm hover:border-indigo-100 transition-colors">
                        <div className="flex items-center gap-4">
                           <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center font-black text-xs text-slate-400">
                              {item.quantity}x
                           </div>
                           <div>
                              <p className="font-bold text-slate-800 text-sm leading-tight">{item.product?.name || `Item #${item.product_id}`}</p>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">₹{fmt(item.price_at_order)} / unit</p>
                           </div>
                        </div>
                        <p className="font-black text-slate-700 text-sm">₹{fmt(item.price_at_order * item.quantity)}</p>
                      </div>
                   ))}
                </div>
             </div>

             {/* Actions */}
             <div className="space-y-4">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Order Actions</h4>
                <div className="grid grid-cols-1 gap-3">
                   <Button
                      onClick={handleReorder}
                      className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl text-sm shadow-xl shadow-indigo-100"
                   >
                      <RotateCcw size={18} className="mr-2" /> Buy Again
                   </Button>

                   {invoice && (
                      <Button
                         variant="outline"
                         onClick={handleDownloadInvoice}
                         className="w-full h-14 border-slate-200 text-slate-700 font-bold rounded-2xl text-sm hover:bg-slate-50 transition-all"
                      >
                         <FileDown size={18} className="mr-2 text-emerald-500" /> Download GST Invoice
                      </Button>
                   )}
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────
export default function CustomerOrders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchOrders = () => {
    setLoading(true);
    setError(null);
    axios.get(`${API}/orders/user/orders/`, {
      headers: { Authorization: `Bearer ${user.token}` },
    })
      .then(res => setOrders(res.data || []))
      .catch(() => setError('Unable to load order history.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (user?.token) fetchOrders();
  }, [user]);

  if (loading) return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 bg-slate-50 rounded-3xl">
      <div className="relative">
        <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
        <ShoppingBag className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-indigo-600" size={24} />
      </div>
      <p className="font-black text-slate-400 uppercase tracking-widest text-[10px]">Retrieving your orders...</p>
    </div>
  );

  return (
    <div className="space-y-8 max-w-5xl mx-auto animate-in fade-in duration-700 pb-20">
      {/* Premium Header */}
      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 overflow-hidden relative">
        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
           <ShoppingBag size={120} />
        </div>
        
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 bg-indigo-600 text-white rounded-3xl shadow-xl shadow-indigo-200 flex items-center justify-center flex-shrink-0">
            <ShoppingBag size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight">Order History</h1>
            <p className="text-sm font-bold text-slate-400 mt-1 uppercase tracking-widest">Track & Manage your business purchases</p>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-slate-50 px-5 py-3 rounded-2xl border border-slate-100">
           <TrendingUp size={18} className="text-emerald-500" />
           <span className="text-sm font-black text-slate-700 tracking-tight">
              {orders.length} <span className="text-slate-400 font-bold uppercase text-[10px] ml-1">Total Orders</span>
           </span>
        </div>
      </div>

      {/* Order List */}
      {orders.length === 0 ? (
        <div className="bg-white rounded-[3rem] border border-dashed border-slate-200 flex flex-col items-center justify-center text-center p-20 gap-6">
          <div className="p-8 bg-slate-50 rounded-full text-slate-200">
            <Package size={80} strokeWidth={1} />
          </div>
          <div>
             <h3 className="text-2xl font-black text-slate-800 tracking-tight">No orders found</h3>
             <p className="text-slate-500 font-medium max-w-xs mx-auto mt-2 leading-relaxed">It seems you haven't placed any orders yet. Start exploring our premium catalog!</p>
          </div>
          <Button 
            onClick={() => window.location.href='/inventory'}
            className="h-14 px-10 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl shadow-xl shadow-indigo-100"
          >
            Browse Products <ArrowRight size={18} className="ml-2" />
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {orders.map(order => <OrderCard key={order.id} order={order} />)}
        </div>
      )}
    </div>
  );
}
