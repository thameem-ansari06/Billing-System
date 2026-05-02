import React, { useState, useEffect } from 'react';
import { FileText, CheckCircle, XCircle, Clock, Eye, Download, MessageSquare, X, ShieldCheck, Tag, Info } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import axios from 'axios';

export default function CustomerQuotes() {
  const [quotes, setQuotes] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { user } = useAuth();

  const fetchQuotes = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get('http://localhost:8000/api/quotes/user', {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      console.log("Customer Quotes fetched:", response.data);
      setQuotes(response.data || []);
    } catch (err) {
      console.error("Fetch Error:", err);
      if (err.response?.status === 401) {
        toast.error("Session expired. Please login again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user?.token) fetchQuotes();
  }, [user]);

  const handleUpdateStatus = async (quoteId, status) => {
    try {
      const response = await axios.put(
        `http://localhost:8000/api/quotes/${quoteId}/status?status=${status}`,
        {}, // Empty data as status is a query param
        { 
          headers: { Authorization: `Bearer ${user.token}` } 
        }
      );

      if (status === 'approved') {
        toast.success("Quote Approved! Redirecting for fulfillment...", {
          icon: '🚀',
          style: { background: '#10b981', color: '#fff' }
        });
      } else {
        toast.error("Quote Rejected. We will contact you shortly.");
      }
      setIsModalOpen(false);
      fetchQuotes();
    } catch (err) {
      console.error("Update Status Error:", err);
      if (err.response?.status === 401) {
        toast.error("Session expired. Please login again.");
      } else {
        toast.error(err.response?.data?.detail || "Failed to update status.");
      }
    }
  };

  const getStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case 'approved':
        return <Badge className="bg-emerald-500 hover:bg-emerald-600 font-bold border-none shadow-sm shadow-emerald-100">Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive" className="font-bold border-none shadow-sm shadow-red-100">Rejected</Badge>;
      case 'ready':
      case 'sent':
        return <Badge className="bg-blue-500 hover:bg-blue-600 font-bold border-none shadow-sm shadow-blue-100">Ready for Review</Badge>;
      case 'expired':
        return <Badge className="bg-slate-500 hover:bg-slate-600 font-bold border-none shadow-sm shadow-slate-100">Expired</Badge>;
      default:
        return <Badge className="bg-amber-500 hover:bg-amber-600 font-bold border-none shadow-sm shadow-amber-100 animate-pulse">Pending Review</Badge>;
    }
  };

  const openDetails = (quote) => {
    setSelectedQuote(quote);
    setIsModalOpen(true);
  };

  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-black text-slate-800 tracking-tight">Proforma Invoices & Quotes</h1>
        <p className="text-sm text-slate-500 font-medium tracking-wide">Review official price proposals and confirm your order placement.</p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {quotes.length === 0 && !isLoading ? (
          <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center">
            <FileText size={48} className="mx-auto mb-4 text-slate-200" />
            <p className="font-bold text-slate-600 text-lg">Your Quote Inbox is Empty</p>
            <p className="text-sm text-slate-400 mt-1 max-w-sm mx-auto">Once the admin processes your order and calculates tax, you'll find the detailed breakdown here.</p>
          </div>
        ) : (
          quotes.map((quote) => (
            <div 
              key={quote.id} 
              onClick={() => openDetails(quote)}
              className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-xl hover:border-indigo-200 transition-all group cursor-pointer"
            >
              <div className="flex flex-col md:flex-row justify-between gap-6">
                <div className="flex-1 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl transition-transform group-hover:scale-110">
                      <FileText size={24} />
                    </div>
                    <div>
                      <h3 className="font-black text-slate-800 text-lg leading-tight">{quote.quote_number}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ref: {quote.reference_number || 'N/A'}</span>
                        <span className="text-slate-300">•</span>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{quote.quote_date}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 pt-2">
                     <div className="space-y-1">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Items Count</span>
                        <p className="text-sm font-bold text-slate-700">{quote.items?.length || 0} Products</p>
                     </div>
                     <div className="space-y-1">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Grand Total (Incl Tax)</span>
                        <p className="text-sm font-black text-indigo-600 text-lg">₹{quote.grand_total?.toLocaleString('en-IN')}</p>
                     </div>
                     <div className="space-y-1 flex flex-col items-start sm:items-end">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Approval Status</span>
                        {getStatusBadge(quote.status)}
                     </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Detail Modal */}
      {isModalOpen && selectedQuote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 transition-all duration-300 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300 my-auto">
             {/* Modal Header */}
             <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center gap-3">
                   <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                      <Tag size={20} />
                   </div>
                   <div>
                      <h2 className="text-xl font-black text-slate-800 leading-none">{selectedQuote.quote_number}</h2>
                      <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">Detailed Proposal Breakdown</p>
                   </div>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 transition-colors">
                   <X size={20} />
                </button>
             </div>

             {/* Modal Body */}
             <div className="p-8 space-y-8">
                {/* Items Table */}
                <div className="space-y-4">
                   <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <Info size={14} /> Itemized Summary
                   </h3>
                   <div className="bg-slate-50 rounded-2xl border border-slate-100 overflow-hidden">
                      <table className="w-full text-sm text-left">
                         <thead className="bg-slate-100 text-slate-500 font-bold">
                            <tr>
                               <th className="p-4">Item Details</th>
                               <th className="p-4 text-center">Qty</th>
                               <th className="p-4 text-right">Amount</th>
                            </tr>
                         </thead>
                         <tbody className="divide-y divide-slate-200">
                            {selectedQuote.items?.map((item, idx) => (
                               <tr key={idx} className="hover:bg-white/50 transition-colors">
                                  <td className="p-4 font-bold text-slate-700">{item.item_details}</td>
                                  <td className="p-4 text-center font-medium text-slate-500">{item.quantity}</td>
                                  <td className="p-4 text-right font-bold text-slate-800">₹{item.amount?.toLocaleString('en-IN')}</td>
                               </tr>
                            ))}
                         </tbody>
                      </table>
                   </div>
                </div>

                {/* Pricing Summary */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-slate-100">
                   <div className="space-y-3">
                      <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs uppercase tracking-widest">
                         <ShieldCheck size={14} /> Compliance Check
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed font-medium">
                         Prices are fixed as per order date. GST components (CGST/SGST/IGST) are calculated based on your place of supply. This is a legally valid proforma invoice.
                      </p>
                   </div>
                   <div className="bg-indigo-50 rounded-2xl p-6 space-y-3">
                      <div className="flex justify-between text-sm font-bold text-slate-500">
                         <span>Subtotal</span>
                         <span>₹{selectedQuote.subtotal?.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between text-sm font-bold text-slate-500">
                         <span>Total GST</span>
                         <span>₹{(selectedQuote.cgst + selectedQuote.sgst + selectedQuote.igst)?.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="pt-3 border-t border-indigo-200 flex justify-between items-end">
                         <span className="text-xs font-black text-indigo-400 uppercase tracking-widest">Grand Total</span>
                         <span className="text-2xl font-black text-indigo-700 leading-none">₹{selectedQuote.grand_total?.toLocaleString('en-IN')}</span>
                      </div>
                   </div>
                </div>
             </div>

             {/* Modal Footer */}
             <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-4">
                {['pending_approval', 'sent', 'ready'].includes(selectedQuote.status?.toLowerCase()) ? (
                  <>
                    <Button 
                      onClick={() => handleUpdateStatus(selectedQuote.id, 'rejected')}
                      variant="outline"
                      className="flex-1 h-12 rounded-xl border-red-200 text-red-500 font-bold hover:bg-red-50 transition-all"
                    >
                      <XCircle size={18} className="mr-2" /> Reject Quote
                    </Button>
                    <Button 
                      onClick={() => handleUpdateStatus(selectedQuote.id, 'approved')}
                      className="flex-[2] h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-lg shadow-emerald-100 transition-all active:scale-95"
                    >
                      <CheckCircle size={18} className="mr-2" /> Approve & Confirm Order
                    </Button>
                  </>
                ) : (
                  <div className="w-full flex flex-col items-center gap-2">
                     {selectedQuote.status?.toLowerCase() === 'approved' ? (
                       <div className="w-full p-3 rounded-xl text-center font-bold text-sm bg-emerald-50 text-emerald-600 border border-emerald-100">
                          This quote has been approved by you. We are preparing your shipment!
                       </div>
                     ) : (
                       <div className="w-full p-3 rounded-xl text-center font-bold text-sm bg-red-50 text-red-600 border border-red-100">
                          This quote was rejected. Please contact support for a revised proposal.
                       </div>
                     )}
                     <Button 
                        onClick={() => setIsModalOpen(false)}
                        className="w-full h-12 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold"
                     >
                        Close View
                     </Button>
                  </div>
                )}
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
