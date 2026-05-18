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

import { API } from '../../config';
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
      const res = await axios.get(`${API}/delivery-tasks/by-order/${order.id}`, {
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
      const res = await axios.get(`${API}/invoices/${invoice.id}/pdf`, {
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
    <div className={`bg-white rounded-xl border transition-all duration-300 overflow-hidden ${expanded ? 'border-indigo-200 shadow-lg shadow-indigo-100/50 ring-1 ring-indigo-50' : 'border-slate-200 shadow-sm hover:shadow-md'}`}>
      {/* Card Header */}
      <div
        className="p-4 flex flex-col md:flex-row md:items-center gap-4 cursor-pointer select-none"
        onClick={() => setExpanded(v => !v)}
      >
        <div className="flex items-center gap-3 flex-1">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-300 ${expanded ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 rotate-6' : 'bg-slate-50 text-slate-400 group-hover:bg-indigo-50'}`}>
            <ShoppingBag size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-800 text-sm tracking-tight">Order #{order.id}</h3>
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-widest ${STATUS_BADGE[order.status] || 'bg-slate-100 text-slate-400'}`}>
                {order.status}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-0.5">
              <p className="flex items-center gap-1 text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
                <Calendar size={10} className="text-indigo-400" />
                {new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
              {invoice && (
                <span className="text-[8px] font-bold uppercase tracking-widest border border-indigo-100 text-indigo-500 bg-indigo-50/50 px-1.5 py-0.5 rounded">
                  Tracking: {invoice.invoice_number}
                </span>
              )}
              {invoice?.delivery_tasks?.[0] && (
                <span className="text-[8px] font-bold uppercase tracking-widest bg-emerald-500 text-white px-1.5 py-0.5 rounded">
                  {invoice.delivery_tasks[0].status}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between md:justify-end gap-4 border-t md:border-none pt-3 md:pt-0">
          <div className="text-right">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Grand Total</p>
            <p className="text-lg font-bold text-slate-800 tracking-tighter">₹{fmt(order.total_amount)}</p>
          </div>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center border border-slate-200 text-slate-400 transition-all ${expanded ? 'rotate-180 bg-slate-800 text-white border-slate-800' : 'bg-white'}`}>
            <ChevronDown size={16} />
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="border-t border-slate-100 bg-slate-50/50 p-4 space-y-4 animate-in slide-in-from-top-2 duration-300">
          
          {/* Timeline Section */}
          <div className="bg-white rounded-xl p-4 border border-indigo-100 shadow-sm space-y-4">
             <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest flex items-center gap-1.5">
                   <Truck size={12} /> Delivery Timeline {task?.invoice_number && `• Tracking ID: ${task.invoice_number}`}
                </h4>
                {loadingTask && <Loader2 size={12} className="animate-spin text-indigo-400" />}
             </div>

             {task ? (
                <VerticalStepper 
                  steps={timelineSteps} 
                  currentStep={timelineSteps.findLastIndex(s => s.timestamp !== undefined)} 
                />
             ) : loadingTask ? (
                <div className="py-4 text-center space-y-2">
                   <div className="w-6 h-6 border-2 border-indigo-100 border-t-indigo-500 rounded-full animate-spin mx-auto" />
                   <p className="text-[9px] font-bold text-slate-400 uppercase">Fetching live tracking...</p>
                </div>
             ) : (
                <div className="py-2 px-3 bg-slate-50 rounded-lg flex items-center gap-2 text-slate-400 italic text-xs">
                   <Info size={14} />
                   <span>Tracking will be available once the order is dispatched.</span>
                </div>
             )}
          </div>

          {/* Items & Actions Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
             {/* Items */}
             <div className="space-y-2">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Items Detail</h4>
                <div className="space-y-1.5">
                   {order.order_items?.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-white rounded-lg p-3 border border-slate-200 shadow-sm hover:border-indigo-100 transition-colors">
                        <div className="flex items-center gap-3">
                           <div className="w-8 h-8 bg-slate-50 rounded-md flex items-center justify-center font-bold text-[10px] text-slate-400">
                              {item.quantity}x
                           </div>
                           <div>
                              <p className="font-bold text-slate-800 text-xs leading-tight">{item.product?.name || `Item #${item.product_id}`}</p>
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">₹{fmt(item.price_at_order)} / unit</p>
                           </div>
                        </div>
                        <p className="font-bold text-slate-700 text-sm">₹{fmt(item.price_at_order * item.quantity)}</p>
                      </div>
                   ))}
                </div>
             </div>

             {/* Actions */}
             <div className="space-y-2">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Order Actions</h4>
                <div className="grid grid-cols-1 gap-2">
                   <Button
                      onClick={handleReorder}
                      className="w-full h-10 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs shadow-md shadow-indigo-100"
                   >
                      <RotateCcw size={14} className="mr-1.5" /> Buy Again
                   </Button>

                   {invoice && (
                      <Button
                         variant="outline"
                         onClick={handleDownloadInvoice}
                         className="w-full h-10 border-slate-200 text-slate-700 font-bold rounded-lg text-xs hover:bg-slate-50 transition-all"
                      >
                         <FileDown size={14} className="mr-1.5 text-emerald-500" /> Download GST Invoice
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
    <div className="space-y-4 max-w-5xl mx-auto animate-in fade-in duration-500 pb-20">
      {/* Premium Header */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 overflow-hidden relative">
        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
           <ShoppingBag size={80} />
        </div>
        
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-indigo-600 text-white rounded-lg shadow-md shadow-indigo-200 flex items-center justify-center flex-shrink-0">
            <ShoppingBag size={18} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">Order History</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Track & Manage your business purchases</p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
           <TrendingUp size={14} className="text-emerald-500" />
           <span className="text-xs font-bold text-slate-700 tracking-tight">
              {orders.length} <span className="text-slate-400 uppercase text-[9px] ml-1">Total Orders</span>
           </span>
        </div>
      </div>

      {/* Order List */}
      {orders.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-200 flex flex-col items-center justify-center text-center p-10 gap-4">
          <div className="p-4 bg-slate-50 rounded-full text-slate-200">
            <Package size={48} strokeWidth={1} />
          </div>
          <div>
             <h3 className="text-lg font-bold text-slate-800 tracking-tight">No orders found</h3>
             <p className="text-slate-500 text-xs font-medium max-w-xs mx-auto mt-1 leading-relaxed">It seems you haven't placed any orders yet. Start exploring our premium catalog!</p>
          </div>
          <Button 
            onClick={() => window.location.href='/inventory'}
            className="h-10 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-md shadow-indigo-100 text-xs"
          >
            Browse Products <ArrowRight size={14} className="ml-1.5" />
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
