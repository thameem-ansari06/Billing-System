import React, { useState, useEffect } from 'react';
import { X, CheckCircle, Clock, Package, Building2, MapPin, CreditCard, ChevronRight, FileText, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { API } from '../config';
import toast from 'react-hot-toast';

export default function OrderDetailModal({ orderId, onClose, user, onOrderUpdated }) {
  const [order, setOrder] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const res = await fetch(`${API}/orders/${orderId}/details`, {
          headers: { 'Authorization': `Bearer ${user.token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setOrder(data);
        } else {
          toast.error("Failed to load order details");
          onClose();
        }
      } catch (err) {
        toast.error("Network error");
        onClose();
      } finally {
        setIsLoading(false);
      }
    };
    if (orderId) fetchDetails();
  }, [orderId, user.token]);

  const handleFinalizeInvoice = async (invoiceId) => {
    // Assuming there's a way to finalize/send. For now, we update status to sent.
    // The requirement says "Add a Quick Action button: If the invoice is PENDING_ADMIN_SEND, show a Finalize & Send Invoice button."
    setIsSending(true);
    try {
      const res = await fetch(`${API}/invoices/${invoiceId}/send`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      if (res.ok) {
        toast.success("Invoice sent successfully!");
        onOrderUpdated();
        onClose();
      } else {
        toast.error("Failed to send invoice");
      }
    } catch (err) {
      toast.error("Error sending invoice");
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center animate-in fade-in">
        <div className="bg-white p-8 rounded-2xl flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 font-bold">Loading Mottha Details...</p>
        </div>
      </div>
    );
  }

  if (!order) return null;

  const pendingInvoice = order.invoices?.find(inv => inv.status === 'PENDING_ADMIN_SEND');

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex justify-end animate-in fade-in">
      <div className="w-full max-w-3xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Badge className={order.order_type === 'Bulk Order' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'}>
                {order.order_type}
              </Badge>
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest">
                {new Date(order.created_at).toLocaleDateString()}
              </span>
            </div>
            <h2 className="text-2xl font-black text-slate-800">Order #{order.id.toString().padStart(4, '0')}</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          
          {/* Customer Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 space-y-3">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Building2 size={14} className="text-indigo-500" /> Customer Details
              </h3>
              <div>
                <p className="text-lg font-bold text-slate-800">{order.customer.full_name}</p>
                <p className="text-sm font-medium text-slate-500">{order.customer.email}</p>
                <p className="text-sm font-medium text-slate-500">{order.customer.phone}</p>
                {order.customer.gstin && (
                  <Badge variant="outline" className="mt-2 text-xs font-bold border-indigo-200 text-indigo-700 bg-indigo-50">
                    GSTIN: {order.customer.gstin}
                  </Badge>
                )}
              </div>
            </div>

            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 space-y-3">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <MapPin size={14} className="text-indigo-500" /> Shipping Address
              </h3>
              <p className="text-sm font-medium text-slate-600 leading-relaxed">
                {order.customer.address}
              </p>
            </div>
          </div>

          {/* Related Documents */}
          {(order.quotes?.length > 0 || order.invoices?.length > 0) && (
            <div>
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <FileText size={14} className="text-indigo-500" /> Related Documents
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {order.quotes?.map(q => (
                  <div key={q.id} className="p-4 rounded-xl border border-slate-200 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div>
                      <p className="font-bold text-slate-800 text-sm">{q.quote_number}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">{q.date}</p>
                    </div>
                    <Badge className="bg-indigo-50 text-indigo-600 border-indigo-100 font-bold text-[10px] uppercase">{q.status}</Badge>
                  </div>
                ))}
                {order.invoices?.map(inv => (
                  <div key={inv.id} className="p-4 rounded-xl border border-slate-200 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div>
                      <p className="font-bold text-slate-800 text-sm">{inv.invoice_number}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">{inv.date}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge className={`${inv.status === 'Paid' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'} font-bold text-[10px] uppercase`}>
                        {inv.status}
                      </Badge>
                      {inv.paid > 0 && <span className="text-[9px] font-black text-emerald-500">Paid: ₹{inv.paid.toLocaleString()}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Timeline */}
          <div>
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Clock size={14} className="text-indigo-500" /> Lifecycle Progress
            </h3>
            <div className="relative border-l-2 border-slate-100 ml-3 space-y-6">
              {order.timeline?.map((step, idx) => (
                <div key={idx} className="relative pl-6">
                  <div className={`absolute -left-[9px] top-1 h-4 w-4 rounded-full border-2 bg-white ${
                    step.status === 'completed' ? 'border-emerald-500 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'border-indigo-500'
                  }`} />
                  <div>
                    <p className={`font-bold text-sm ${step.status === 'completed' ? 'text-slate-800' : 'text-indigo-600'}`}>
                      {step.stage}
                    </p>
                    {step.date && <p className="text-[10px] font-black text-slate-400 mt-0.5 uppercase tracking-wider">{new Date(step.date).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Line Items */}
          <div>
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Package size={14} className="text-indigo-500" /> Order Components
            </h3>
            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                  <tr>
                    <th className="p-4 font-black text-[10px] uppercase tracking-widest">Product</th>
                    <th className="p-4 font-black text-[10px] uppercase tracking-widest text-center">Qty</th>
                    <th className="p-4 font-black text-[10px] uppercase tracking-widest text-right">Rate</th>
                    <th className="p-4 font-black text-[10px] uppercase tracking-widest text-right">Tax (GST)</th>
                    <th className="p-4 font-black text-[10px] uppercase tracking-widest text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {order.items?.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4">
                        <p className="font-bold text-slate-800">{item.product_name}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">SKU: {item.sku}</p>
                      </td>
                      <td className="p-4 text-center font-bold text-slate-600">{item.quantity}</td>
                      <td className="p-4 text-right font-medium text-slate-600">₹{item.rate.toLocaleString()}</td>
                      <td className="p-4 text-right">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">{item.gst}%</span>
                        <span className="text-[11px] font-bold text-indigo-500">₹{(item.amount * (item.gst/100)).toLocaleString()}</span>
                      </td>
                      <td className="p-4 text-right font-black text-slate-900">₹{item.amount.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="p-6 bg-slate-50 border-t border-slate-200 grid grid-cols-2 gap-4">
                <div className="space-y-1">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pricing Notes</p>
                   <p className="text-[10px] text-slate-500 leading-relaxed font-medium">All prices include applicable GST. Order subtotal represents value before taxes.</p>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold text-slate-500">
                    <span>Subtotal</span>
                    <span>₹{order.tax_summary.subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-xs font-bold text-indigo-500">
                    <span>CGST + SGST (9% each)</span>
                    <span>₹{(order.tax_summary.cgst + order.tax_summary.sgst).toLocaleString()}</span>
                  </div>
                  <div className="pt-2 border-t border-slate-200 flex justify-between items-end">
                    <p className="text-xs font-black text-slate-800 uppercase tracking-widest">Grand Total</p>
                    <p className="text-2xl font-black text-slate-900 leading-none">₹{parseFloat(order.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-slate-100 bg-white flex justify-end gap-3 shadow-[0_-4px_10px_rgba(0,0,0,0.02)]">
          <Button variant="outline" onClick={onClose} className="h-11 px-8 rounded-xl font-bold border-slate-200 text-slate-600 hover:bg-slate-50">
            Close Panel
          </Button>
          
          {pendingInvoice && (
            <Button 
              onClick={() => handleFinalizeInvoice(pendingInvoice.id)}
              disabled={isSending}
              className="h-11 px-8 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black flex items-center gap-2 shadow-lg shadow-indigo-100"
            >
              {isSending ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Send size={16} />
              )}
              Finalize & Send Invoice
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
